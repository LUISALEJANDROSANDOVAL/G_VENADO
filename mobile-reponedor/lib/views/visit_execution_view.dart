import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
import '../widgets/offline_banner.dart';
import '../widgets/sync_status_card.dart';
import '../widgets/task_checklist_item.dart';
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
      final bytes = await imageFile.readAsBytes();
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
        filePath: imageFile!.path,
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
                Text(
                  MockData.checklistLabel(_visit.pdv.customerType),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                VisitTasksProgress(tasks: _visit.tasks),
                const SizedBox(height: 12),
                if (!_checklistEnabled)
                  Card(
                    color: AppColors.error.withValues(alpha: 0.08),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.error, width: 1),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Icon(Icons.lock_outline, color: AppColors.error, size: 18),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Checklist bloqueado hasta validar geofence',
                              style: TextStyle(fontSize: 13, color: AppColors.error, fontWeight: FontWeight.bold),
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        border: Border(bottom: BorderSide(color: AppColors.inputBorder)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(_visit.pdv.name, style: Theme.of(context).textTheme.titleMedium),
              ),
              CustomerTypeBadge(type: _visit.pdv.customerType),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.login, size: 14, color: AppColors.secondaryText),
              const SizedBox(width: 4),
              Text('Llegada: $_arrivalLabel', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChronometer(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        child: Column(
          children: [
            Text('Tiempo de visita', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Text(
              formatDuration(_elapsedSeconds),
              style: const TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
                color: AppColors.institutionalBlue,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
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
            // Botón cámara: solo activo cuando el checklist está habilitado
            SizedBox(
              height: 56,
              child: OutlinedButton.icon(
                onPressed: _checklistEnabled && !_isFinishing ? _takeEvidence : null,
                icon: const Icon(Icons.camera_alt),
                label: const Text('Evidencia'),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: _checklistEnabled
                        ? AppColors.institutionalBlue
                        : AppColors.inputBorder,
                    width: 1.5,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
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