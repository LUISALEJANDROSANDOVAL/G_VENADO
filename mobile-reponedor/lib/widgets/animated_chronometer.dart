import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Cronómetro animado con anillo de progreso circular y pulso.
class AnimatedChronometer extends StatefulWidget {
  const AnimatedChronometer({
    super.key,
    required this.elapsedSeconds,
    required this.estimatedSeconds,
  });

  final int elapsedSeconds;
  final int estimatedSeconds;

  @override
  State<AnimatedChronometer> createState() => _AnimatedChronometerState();
}

class _AnimatedChronometerState extends State<AnimatedChronometer>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  String _formatTime(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.estimatedSeconds > 0
        ? (widget.elapsedSeconds / widget.estimatedSeconds).clamp(0.0, 1.0)
        : 0.0;
        
    final isOvertime = widget.elapsedSeconds > widget.estimatedSeconds;
    final mainColor = isOvertime ? AppColors.error : AppColors.institutionalBlue;

    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Anillo de progreso animado
          SizedBox(
            width: 140,
            height: 140,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: progress),
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) {
                return CustomPaint(
                  painter: _ChronometerPainter(
                    progress: value,
                    color: mainColor,
                    backgroundColor: AppColors.inputBorder,
                    isOvertime: isOvertime,
                  ),
                );
              },
            ),
          ),
          // Contenido central
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: isOvertime ? _pulseAnimation.value : 1.0,
                    child: child,
                  );
                },
                child: Icon(
                  Icons.timer,
                  color: mainColor,
                  size: 24,
                ),
              ),
              const SizedBox(height: 8),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: Theme.of(context).textTheme.headlineMedium!.copyWith(
                      color: mainColor,
                      fontWeight: FontWeight.w900,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                child: Text(_formatTime(widget.elapsedSeconds)),
              ),
              const SizedBox(height: 4),
              Text(
                'de ${_formatTime(widget.estimatedSeconds)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isOvertime ? AppColors.error : AppColors.secondaryText,
                      fontWeight: isOvertime ? FontWeight.bold : FontWeight.normal,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChronometerPainter extends CustomPainter {
  _ChronometerPainter({
    required this.progress,
    required this.color,
    required this.backgroundColor,
    required this.isOvertime,
  });

  final double progress;
  final Color color;
  final Color backgroundColor;
  final bool isOvertime;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width / 2, size.height / 2) - 8;

    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    // Dibujar fondo
    canvas.drawCircle(center, radius, bgPaint);

    if (isOvertime) {
      // Si se pasó del tiempo, todo el anillo es del color de overtime
      canvas.drawCircle(center, radius, progressPaint);
    } else {
      // Dibujar arco de progreso (comienza en -pi/2, o sea arriba)
      final sweepAngle = 2 * math.pi * progress;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        sweepAngle,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ChronometerPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.isOvertime != isOvertime;
  }
}
