import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:latlong2/latlong.dart';
import '../data/mock_data.dart';
import '../models/enums.dart';
import '../models/evidence.dart';
import '../models/pdv.dart';
import '../models/task.dart';
import '../models/visit.dart';
import '../services/app_connection_service.dart';
import '../services/gps_service.dart';
import '../services/route_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/customer_type_badge.dart';
import '../widgets/evidence_gallery.dart';
import '../widgets/geofence_status_chip.dart';
import '../widgets/mapbox_route_map.dart';
import '../widgets/offline_banner.dart';
import '../widgets/sync_status_card.dart';
import '../widgets/task_checklist_item.dart';
import '../widgets/animated_chronometer.dart';
import 'visit_summary_view.dart';

/// Pantalla de ejecución de visita dentro del PDV.
class VisitExecutionView extends StatefulWidget {
  const VisitExecutionView({
    super.key,
    required this.initialVisit,
    required this.allPdvs,
    this.onVisitCompleted,
  });

  final Visit initialVisit;
  final List<Pdv> allPdvs;
  final void Function(Visit completedVisit)? onVisitCompleted;

  @override
  State<VisitExecutionView> createState() => _VisitExecutionViewState();
}

class _VisitExecutionViewState extends State<VisitExecutionView> {
  late Visit _visit;
  Timer? _visitTimer;
  Timer? _geofenceTimer;
  int _elapsedSeconds = 0;
  bool _isFinishing = false;

  bool get _checklistEnabled =>
      _visit.geofenceStatus != GeofenceStatus.fueraDelPdv;

  int get _requiredEvidence =>
      MockData.requiredEvidenceCount(_visit.pdv.customerType);

  int get _capturedEvidence =>
      _visit.evidences.where((e) => e.status != EvidenceStatus.pendiente).length;

  @override
  void initState() {
    super.initState();
    _visit = widget.initialVisit;
    _elapsedSeconds = _visit.elapsedSeconds;
    _startVisitTimer();
    _loadTasks();
    _startGeofenceCheck();
  }

  /// Verifica automáticamente cada 10 segundos si el reponedor ya está
  /// dentro del radio del PDV (50 metros) usando el GPS real.
  /// Si el GPS no tiene posición todavía, no cambia el estado.
  void _startGeofenceCheck() {
    final pdvLat = _visit.pdv.latitude;
    final pdvLng = _visit.pdv.longitude;

    if (pdvLat == null || pdvLng == null) {
      // El PDV no tiene coordenadas GPS registradas.
      // Habilitar el checklist de inmediato para no bloquear el trabajo.
      if (mounted) {
        setState(() {
          _visit = _visit.copyWith(geofenceStatus: GeofenceStatus.dentroDelRadio);
        });
      }
      return;
    }

    // El PDV tiene coordenadas reales: GPS automático cada 10 segundos.
    _geofenceTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!mounted) return;
      final isInside = GpsService.instance.isInsidePdv(
        pdvLat: pdvLat,
        pdvLng: pdvLng,
      );

      if (isInside && _visit.geofenceStatus == GeofenceStatus.fueraDelPdv) {
        setState(() {
          _visit = _visit.copyWith(geofenceStatus: GeofenceStatus.dentroDelRadio);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('GPS: Llegada al PDV detectada — Checklist desbloqueado ✓'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    });
  }

  Future<void> _loadTasks() async {
    try {
      final realTasks = await RouteRepository.instance.fetchTasksForPdv(
        _visit.pdv.id,
        _visit.pdv.customerType,
      );
      if (mounted) {
        setState(() {
          _visit = _visit.copyWith(tasks: realTasks);
        });
      }
    } catch (_) {
      // Fallback a mock tasks
    }
  }

  @override
  void dispose() {
    _visitTimer?.cancel();
    _geofenceTimer?.cancel();
    super.dispose();
  }

  void _startVisitTimer() {
    _visitTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _elapsedSeconds++);
    });
  }

  String get _arrivalLabel {
    final t = _visit.arrivalTime;
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }


  void _onTaskChecked(int index, bool? value) {
    if (!_checklistEnabled) return;
    setState(() {
      final tasks = List<Task>.from(_visit.tasks);
      tasks[index] = tasks[index].copyWith(isCompleted: value ?? false);
      _visit = _visit.copyWith(tasks: tasks);
    });
  }

  void _onTimerAction(int index) {
    if (!_checklistEnabled) return;
    setState(() {
      final tasks = List<Task>.from(_visit.tasks);
      final task = tasks[index];
      final newState = switch (task.timerState) {
        TaskTimerState.idle => TaskTimerState.running,
        TaskTimerState.running => TaskTimerState.paused,
        TaskTimerState.paused => TaskTimerState.finished,
        TaskTimerState.finished => TaskTimerState.finished,
      };

      tasks[index] = task.copyWith(
        timerState: newState,
        isCompleted: newState == TaskTimerState.finished ? true : task.isCompleted,
      );
      _visit = _visit.copyWith(tasks: tasks);

      if (newState == TaskTimerState.running) _simulateTaskTick(index);
    });
  }

  void _simulateTaskTick(int index) {
    Future<void>.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      final task = _visit.tasks[index];
      if (task.timerState != TaskTimerState.running) return;
      setState(() {
        final tasks = List<Task>.from(_visit.tasks);
        tasks[index] = task.copyWith(accumulatedSeconds: task.accumulatedSeconds + 1);
        _visit = _visit.copyWith(tasks: tasks);
      });
      _simulateTaskTick(index);
    });
  }

  /// Guarda la foto en el directorio permanente de la app (no en caché temporal)
  /// y la comprime para ahorrar datos móviles al reponedor.
  Future<String?> _saveToPermStorage(XFile imageFile) async {
    try {
      if (kIsWeb) return imageFile.path; // Web no tiene filesystem real

      final documentsDir = await getApplicationDocumentsDirectory();
      final evidenceDir = Directory(p.join(documentsDir.path, 'evidences'));
      if (!await evidenceDir.exists()) {
        await evidenceDir.create(recursive: true);
      }

      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${p.basename(imageFile.path)}';
      final targetPath = p.join(evidenceDir.path, fileName);

      // Comprimir y redimensionar (4K → 1080p máx, calidad 75%)
      final compressedFile = await FlutterImageCompress.compressAndGetFile(
        imageFile.path,
        targetPath,
        quality: 75,
        minWidth: 1080,
        minHeight: 1080,
      );

      if (compressedFile != null) {
        return compressedFile.path;
      }

      // Fallback: copiar sin comprimir si la compresión falla
      final original = File(imageFile.path);
      final copied = await original.copy(targetPath);
      return copied.path;
    } catch (e) {
      // ignore: avoid_print
      print('[VisitExecutionView] Error guardando foto en almacenamiento permanente: $e');
      return imageFile.path; // Fallback a la ruta original de caché
    }
  }

  Future<void> _takeEvidence() async {
    if (!_checklistEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debes estar dentro del PDV para capturar evidencias'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final type = await showEvidenceCaptureDialog(context);
    if (type == null || !mounted) return;

    final picker = ImagePicker();
    XFile? imageFile;
    try {
      imageFile = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
      );
    } catch (e) {
      if (!mounted) return;
      // ignore: avoid_print
      print('[VisitExecutionView] Error abriendo la cámara: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al acceder a la cámara: $e'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (imageFile == null) return;
    if (!mounted) return;

    // ── Enterprise: Mover de caché temporal a almacenamiento permanente ──
    final permanentPath = await _saveToPermStorage(imageFile);

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Text('Subiendo foto a Supabase Storage...'),
          ],
        ),
        duration: Duration(days: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    String? publicUrl;
    bool isUploaded = false;

    try {
      final file = File(permanentPath ?? imageFile.path);
      final bytes = await file.readAsBytes();
      final fileName = '${type.name}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      
      publicUrl = await RouteRepository.instance.uploadEvidence(
        bytes: bytes,
        fileName: fileName,
        mimeType: 'image/jpeg',
      );
      
      if (publicUrl != null) {
        isUploaded = true;
      }
    } catch (e) {
      // ignore: avoid_print
      print('[VisitExecutionView] Error subiendo archivo: $e');
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();

    setState(() {
      final evidences = List<Evidence>.from(_visit.evidences);
      final pendingIndex = evidences.indexWhere(
        (e) => e.status == EvidenceStatus.pendiente && e.type == type,
      );

      final color = switch (type) {
        EvidenceType.antes => AppColors.steelBlue,
        EvidenceType.despues => AppColors.royalBlue,
        EvidenceType.general => AppColors.cornflowerBlue,
      };

      final newEvidence = Evidence(
        id: pendingIndex != -1 ? evidences[pendingIndex].id : 'e-${evidences.length + 1}',
        label: switch (type) {
          EvidenceType.antes => 'Antes',
          EvidenceType.despues => 'Después',
          EvidenceType.general => 'Evidencia ${evidences.length + 1}',
        },
        status: isUploaded ? EvidenceStatus.sincronizada : EvidenceStatus.capturada,
        type: type,
        mockColor: color,
        filePath: permanentPath ?? imageFile!.path,
        publicUrl: publicUrl,
      );

      if (pendingIndex != -1) {
        evidences[pendingIndex] = newEvidence;
      } else {
        evidences.add(newEvidence);
      }
      _visit = _visit.copyWith(evidences: evidences);
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isUploaded 
              ? 'Evidencia "${type.name}" sincronizada con Supabase ✓'
              : 'Evidencia "${type.name}" guardada localmente',
        ),
        backgroundColor: isUploaded ? AppColors.success : AppColors.warning,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _finishVisit() async {
    if (!_checklistEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Valida tu llegada al PDV antes de finalizar'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // Cancelar timers antes de cualquier operación async para evitar
    // que disparen setState sobre el widget desmontado.
    _visitTimer?.cancel();
    _visitTimer = null;
    _geofenceTimer?.cancel();
    _geofenceTimer = null;

    setState(() {
      _isFinishing = true;
      _visit = _visit.copyWith(
        syncStatus: SyncStatus.enviando,
        geofenceStatus: GeofenceStatus.visitaValidada,
      );
    });

    try {
      final now = DateTime.now();
      final start = _visit.arrivalTime;
      
      for (final task in _visit.tasks) {
        if (task.isCompleted) {
          final duration = task.accumulatedSeconds > 0 
              ? task.accumulatedSeconds 
              : 300;
          
          String? photoUrl;
          String? localPhotoPath;
          if (task.requiresPhoto) {
            final uploadedEv = _visit.evidences.firstWhere(
              (e) => e.status != EvidenceStatus.pendiente && (e.publicUrl != null || e.filePath != null),
              orElse: () => const Evidence(
                id: '',
                label: '',
                status: EvidenceStatus.pendiente,
                type: EvidenceType.general,
              ),
            );

            if (uploadedEv.id.isNotEmpty) {
              // Foto sincronizada: usar URL pública de Supabase Storage
              // Foto local (sin señal): guardar ruta local para re-subir al sync
              photoUrl = uploadedEv.publicUrl;
              localPhotoPath = uploadedEv.filePath;
            }
          }

          await RouteRepository.instance.saveTaskLog(
            posId: _visit.pdv.id,
            taskId: int.tryParse(task.id) ?? 1,
            startTime: start,
            endTime: now,
            durationSeconds: duration,
            photoUrl: photoUrl,
            localPhotoPath: localPhotoPath,
          );
        }
      }
    } catch (e) {
      // ignore: avoid_print
      print('[VisitExecutionView] Error guardando logs de tareas: $e');
    }

    await Future<void>.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    final isOffline = AppConnectionService.instance.isOffline;
    final completedVisit = _visit.copyWith(
      syncStatus: isOffline ? SyncStatus.pendiente : SyncStatus.sincronizado,
    );
    final nextPdv = MockData.nextPendingPdv(widget.allPdvs, afterPdvId: _visit.pdv.id);

    // Notificar al padre ANTES de navegar para que actualice la lista
    // mientras la RouteView todavía está montada en el stack.
    widget.onVisitCompleted?.call(completedVisit);

    if (!mounted) return;

    navigateToVisitSummary(
      context,
      visit: completedVisit,
      elapsedSeconds: _elapsedSeconds,
      nextPdv: nextPdv,
      onDone: () {
        AppConnectionService.instance.refreshPendingCount();
      },
    );
  }

  void _openNavigation() {
    final target = _visit.pdv;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Abrir navegación',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Destino: ${target.name}',
                  style: Theme.of(context).textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                Text(
                  target.address,
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                _NavOptionTile(
                  icon: Icons.map,
                  label: 'Google Maps',
                  color: AppColors.success,
                  onTap: () {
                    Navigator.pop(context);
                    _showNavSnackbar('Google Maps', target.name);
                  },
                ),
                const SizedBox(height: 10),
                _NavOptionTile(
                  icon: Icons.navigation,
                  label: 'Waze',
                  color: AppColors.activeBlue,
                  onTap: () {
                    Navigator.pop(context);
                    _showNavSnackbar('Waze', target.name);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNavSnackbar(String app, String targetName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Simulación: abriendo $app hacia $targetName'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_visit.pdv.name, overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          _buildFixedHeader(context),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                _buildChronometer(context),
                const SizedBox(height: 16),
                GeofenceStatusChip(
                  status: _visit.geofenceStatus,
                  hasPdvCoordinates: _visit.pdv.latitude != null && _visit.pdv.longitude != null,
                ),
                const SizedBox(height: 20),
                if (_visit.pdv.latitude != null && _visit.pdv.longitude != null) ...[
                  _buildRouteGuide(context),
                  const SizedBox(height: 20),
                ],
                Text(
                  MockData.checklistLabel(_visit.pdv.customerType),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                VisitTasksProgress(tasks: _visit.tasks),
                const SizedBox(height: 12),
                if (!_checklistEnabled)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.cardBackground,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.error.withValues(alpha: 0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.lock_outline, color: AppColors.error, size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Fuera del rango',
                                  style: TextStyle(fontSize: 14, color: AppColors.error, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Acércate al local para desbloquear tareas',
                                  style: TextStyle(fontSize: 12, color: AppColors.secondaryText),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ...List.generate(_visit.tasks.length, (i) {
                  return TaskChecklistItem(
                    task: _visit.tasks[i],
                    isLocked: !_checklistEnabled,
                    onCheckedChanged: (v) => _onTaskChecked(i, v),
                    onTimerAction: () => _onTimerAction(i),
                  );
                }),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Evidencias', style: Theme.of(context).textTheme.titleMedium),
                    Text(
                      '$_capturedEvidence / $_requiredEvidence',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: _capturedEvidence >= _requiredEvidence
                                ? AppColors.success
                                : AppColors.institutionalBlue,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                EvidenceGallery(
                  evidences: _visit.evidences,
                  requiredCount: _requiredEvidence,
                  onTapEvidence: (e) => showEvidencePreview(context, e),
                ),
                const SizedBox(height: 20),
                SyncStatusCard(status: _visit.syncStatus),
              ],
            ),
          ),
          _buildFinishButton(),
        ],
      ),
    );
  }

  Widget _buildFixedHeader(BuildContext context) {
    final completedTasks = _visit.tasks.where((t) => t.isCompleted).length;
    final totalTasks = _visit.tasks.length;
    final progress = totalTasks > 0 ? completedTasks / totalTasks : 0.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        border: const Border(bottom: BorderSide(color: AppColors.inputBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Hero(
            tag: 'pdv-number-${_visit.pdv.id}',
            child: Material(
              color: Colors.transparent,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 52,
                    height: 52,
                    child: CircularProgressIndicator(
                      value: progress,
                      strokeWidth: 3,
                      backgroundColor: AppColors.inputBorder.withValues(alpha: 0.5),
                      valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
                    ),
                  ),
                  Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _visit.pdv.status == VisitStatus.completada ? AppColors.success : AppColors.traceRed,
                      shape: BoxShape.circle,
                    ),
                    child: _visit.pdv.status == VisitStatus.completada
                      ? const Icon(Icons.check, color: Colors.white, size: 24)
                      : Text(
                          '${_visit.pdv.visitNumber}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        _visit.pdv.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    CustomerTypeBadge(type: _visit.pdv.customerType),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.login, size: 14, color: AppColors.secondaryText),
                    const SizedBox(width: 4),
                    Text('Llegada: $_arrivalLabel', style: Theme.of(context).textTheme.bodySmall),
                    const Spacer(),
                    Text(
                      '$completedTasks de $totalTasks tareas',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: progress == 1.0 ? AppColors.success : AppColors.traceRed,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChronometer(BuildContext context) {
    return Card(
      color: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: const RoundedRectangleBorder(side: BorderSide.none),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        child: AnimatedChronometer(
          elapsedSeconds: _elapsedSeconds,
          estimatedSeconds: _parseEstimatedSeconds(_visit.pdv.estimatedTime),
        ),
      ),
    );
  }

  Widget _buildRouteGuide(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Guía de ruta',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Visualiza tu ruta óptima hacia el PDV activo y los próximos puntos programados.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.secondaryText),
        ),
        const SizedBox(height: 12),
        MapboxRouteMap(
          pdvs: widget.allPdvs,
          activePdvId: _visit.pdv.id,
          initialCenter: LatLng(_visit.pdv.latitude!, _visit.pdv.longitude!),
        ),
      ],
    );
  }

  int _parseEstimatedSeconds(String timeStr) {
    // Convierte "00:15" a segundos = 15 * 60 = 900
    try {
      final parts = timeStr.split(':');
      if (parts.length == 2) {
        final hours = int.parse(parts[0]);
        final mins = int.parse(parts[1]);
        return (hours * 3600) + (mins * 60);
      }
    } catch (_) {}
    return 1800; // 30 minutos por defecto
  }


  Widget _buildFinishButton() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        border: Border(top: BorderSide(color: AppColors.inputBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Botón contextual: Navegar vs Cámara
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: SizedBox(
                key: ValueKey(_checklistEnabled),
                height: 56,
                child: _checklistEnabled
                    ? OutlinedButton.icon(
                        onPressed: !_isFinishing ? _takeEvidence : null,
                        icon: const Icon(Icons.camera_alt),
                        label: const Text('Evidencia'),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.institutionalBlue, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      )
                    : ElevatedButton.icon(
                        onPressed: _openNavigation,
                        icon: const Icon(Icons.directions),
                        label: const Text('Navegar'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.traceRed,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            // Botón principal: Finalizar Visita
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _isFinishing ? null : _finishVisit,
                  child: _isFinishing
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Finalizar Visita'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavOptionTile extends StatelessWidget {
  const _NavOptionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.darkBackground,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 14),
              Text(label, style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              const Icon(Icons.open_in_new, size: 18, color: AppColors.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}