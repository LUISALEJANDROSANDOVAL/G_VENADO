class RouteHistoryItem {
  const RouteHistoryItem({
    required this.planId,
    required this.date,
    required this.totalStops,
    required this.completedStops,
    required this.status,
  });

  final String planId;
  final DateTime date;
  final int totalStops;
  final int completedStops;
  final String status;

  String get dateLabel {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  String get completionLabel => '$completedStops de $totalStops visitas completadas';
}
