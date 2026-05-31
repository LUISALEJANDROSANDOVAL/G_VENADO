import 'package:flutter/material.dart';
import '../theme/trace_login_colors.dart';

/// Logo TRACE V desde assets/images/trace_v_logo.png
class TraceLogo extends StatelessWidget {
  const TraceLogo({
    super.key,
    this.width = 200,
    this.height,
  });

  final double width;
  final double? height;

  static const assetPath = 'assets/images/trace_v_logo.png';

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      assetPath,
      width: width,
      height: height,
      fit: BoxFit.contain,
      gaplessPlayback: true,
      filterQuality: FilterQuality.high,
      errorBuilder: (context, error, stackTrace) {
        debugPrint('Error cargando logo TRACE V: $error');
        return Container(
          width: width,
          height: height ?? width * 0.85,
          color: TraceLoginColors.headerRed,
          alignment: Alignment.center,
          child: const Icon(
            Icons.image_not_supported_outlined,
            color: TraceLoginColors.onPrimary,
            size: 48,
          ),
        );
      },
    );
  }
}
