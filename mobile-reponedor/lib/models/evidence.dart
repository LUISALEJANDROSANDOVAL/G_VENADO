import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'enums.dart';

/// Evidencia fotográfica capturada en el PDV.
class Evidence {
  const Evidence({
    required this.id,
    required this.label,
    required this.status,
    required this.type,
    this.mockColor = AppColors.steelBlue,
    this.taskId,
    this.filePath,
    this.publicUrl,
  });

  final String id;
  final String label;
  final EvidenceStatus status;
  final EvidenceType type;
  final Color mockColor;
  final String? taskId;
  final String? filePath;
  final String? publicUrl;

  Evidence copyWith({
    EvidenceStatus? status,
    Color? mockColor,
    String? filePath,
    String? publicUrl,
  }) {
    return Evidence(
      id: id,
      label: label,
      status: status ?? this.status,
      type: type,
      mockColor: mockColor ?? this.mockColor,
      taskId: taskId,
      filePath: filePath ?? this.filePath,
      publicUrl: publicUrl ?? this.publicUrl,
    );
  }
}
