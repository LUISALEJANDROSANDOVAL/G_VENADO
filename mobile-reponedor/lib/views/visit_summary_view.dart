import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../models/visit.dart';
import '../theme/app_colors.dart';
import '../widgets/customer_type_badge.dart';
import '../widgets/sync_status_card.dart';
import '../widgets/task_checklist_item.dart';

/// Resumen post-visita antes de volver a la ruta (Caso de Estudio 1 y 3).
class VisitSummaryView extends StatelessWidget {
  const VisitSummaryView({
    super.key,
    required this.visit,
    required this.elapsedSeconds,
    this.nextPdv,
    required this.onContinue,
  });

  final Visit visit;
  final int elapsedSeconds;
  final Pdv? nextPdv;
  final VoidCallback onContinue;

  int get _capturedEvidences =>
      visit.evidences.where((e) => e.status != EvidenceStatus.pendiente).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Resumen de visita')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                visit.pdv.name,
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                            ),
                            CustomerTypeBadge(type: visit.pdv.customerType),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(Icons.check_circle, color: AppColors.success, size: 20),
                            SizedBox(width: 8),
                            Text('Visita completada y sincronizada', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.success)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TaskTimeSummary(tasks: visit.tasks, totalSeconds: elapsedSeconds),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(Icons.photo_library, color: AppColors.institutionalBlue),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Evidencias', style: Theme.of(context).textTheme.titleMedium),
                              Text(
                                '$_capturedEvidences capturadas',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SyncStatusCard(status: visit.syncStatus),
                if (nextPdv != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    color: AppColors.institutionalBlue.withValues(alpha: 0.06),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: AppColors.institutionalBlue, width: 1.5),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Siguiente visita'.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.institutionalBlue,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '#${nextPdv!.visitNumber} ${nextPdv!.name}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            nextPdv!.address,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          _buildActions(context),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        border: Border(top: BorderSide(color: AppColors.inputBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (nextPdv != null)
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: onContinue,
                  icon: const Icon(Icons.navigation),
                  label: Text('Ir a visita #${nextPdv!.visitNumber}'),
                ),
              )
            else
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: onContinue,
                  child: const Text('Volver a mi ruta'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Callback helper para navegar al resumen tras finalizar visita.
void navigateToVisitSummary(
  BuildContext context, {
  required Visit visit,
  required int elapsedSeconds,
  required Pdv? nextPdv,
  required VoidCallback onDone,
}) {
  Navigator.of(context).pushReplacement<void, void>(
    MaterialPageRoute<void>(
      builder: (summaryContext) => VisitSummaryView(
        visit: visit,
        elapsedSeconds: elapsedSeconds,
        nextPdv: nextPdv,
        onContinue: () {
          Navigator.of(summaryContext).pop();
          onDone();
        },
      ),
    ),
  );
}
