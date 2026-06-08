import 'package:flutter/material.dart';

class AppColors {
  static const Color institutionalBlue = Color(0xFF0056D2);
  static const Color surface = Color(0xFFF8F9FA);
  static const Color cardBackground = Colors.white;
  // ── PALETA BASE (Los colores reales) ──────────────────────────
  static const Color primary = Color(0xFFAA001B);
  static const Color primaryAccent = Color(0xFFD11F2D);
  static const Color border = Color(0xFFE5E5EA);
  static const Color textPrimary = Color(0xFF1A1C1C);
  static const Color textSecondary = Color(0xFF5E5E5E);
  static const Color success = Color(0xFF00875A);
  static const Color error = Color(0xFFF23036);
  static const Color warning = Color(0xFFFFAB00);
  static const Color whiteSurface = Color(0xFFFFFFFF);
  static const Color lightBackground = Color(0xFFF4F5F6);
  static const Color crimson = Color(0xFFDC143C);

<<<<<<< Updated upstream
  // ── Rojos Corporativos TRACE V ───────────────────────────────────────────
  static const primaryRed = Color(0xFFAA001B);       // Rojo principal del login
  static const primaryRedAccent = Color(0xFFD11F2D); // Rojo brillante/activo
  static const headerRed = Color(0xFFA51D24);        // Rojo del header del logo

  // ── Azules/Celestes Semánticos ───────────────────────────────────────────
  static const royalBlue = Color(0xFF0C71C3);
  static const activeBlue = Color(0xFF3BA8ED);       // Dodger Blue
  static const darkSlateBlue = Color(0xFF2B55A2);
  static const cornflowerBlue = Color(0xFF5FA1DE);

  // ── Fondos y Superficies Claras (Diseño Premium) ─────────────────────────
  static const lightBackground = Color(0xFFF4F5F6);  // Fondo gris claro Apple-style
  static const whiteSurface = Color(0xFFFFFFFF);     // Superficie blanca para tarjetas
  static const lightGrayBorder = Color(0xFFE5E5EA);  // Bordes sutiles

  // ── Escala de Grises (Textos y Bordes) ───────────────────────────────────
  static const textDarkCharcoal = Color(0xFF1A1C1C); // Texto principal (onSurface)
  static const textMediumGrey = Color(0xFF5E5E5E);   // Texto secundario
  static const textLightGrey = Color(0xFF8E8E93);    // Placeholder / deshabilitado
  static const darkGray = Color(0xFF999999);         // Detallista Gray del documento

  // ── Estados Semánticos ───────────────────────────────────────────────────
  static const emeraldGreen = Color(0xFF00875A);     // Éxito / completado legible
  static const amberOrange = Color(0xFFD97706);      // Advertencia / pendiente legible
  static const crimsonRed = Color(0xFFF23036);       // Error / alerta crítica

  // ── Alias semánticos (mismos nombres para mantener compatibilidad en código) ──
  static const institutionalBlue = primaryRed;        // Usamos el rojo TRACE V como primario
  static const wholesaleBlue = darkSlateBlue;
  static const paretoRed = primaryRed;

  static const darkBackground = lightBackground;    // Apunta al fondo claro
  static const background = lightBackground;        // Alias para el fondo principal
  static const cardBackground = whiteSurface;       // Apunta a la tarjeta blanca
  static const inputBorder = lightGrayBorder;
  static const primaryText = textDarkCharcoal;       // El texto principal ahora es oscuro
  static const secondaryText = textMediumGrey;       // El texto secundario es gris medio
  static const dimGrayText = textLightGrey;          // Alias para textos gris claro
  static const detallistaGray = darkGray;
  static const traceRed = primaryRed;                // Alias para el rojo de TRACE V

  // ── Adicionales para compatibilidad de vistas ────────────────────────────
  static const darkSlateGray = lightBackground;
  static const darkSlateGrayCard = whiteSurface;
  static const darkSlateGrayAlt = Color(0xFFE5E5EA);
  static const dimGray = Color(0xFF8E8E93);
  static const dimGrayBorder = lightGrayBorder;
  static const snow = whiteSurface;
  static const steelBlue = institutionalBlue;
  static const crimson = error;
  static const crimsonAlt = error;
  static const darkTurquoise = success;

  /// Estados positivos: completado, sincronizado, validado
  static const success = emeraldGreen;

  /// Estados de atención: pendiente, pausado, en espera
  static const warning = amberOrange;

  /// Errores y alertas críticas
  static const error = crimsonRed;
}
=======
  // ── ALIAS NECESARIOS (Para que los archivos existentes no den error) ──
>>>>>>> Stashed changes

  static const Color activeBlue = primary;
  static const Color wholesaleBlue = primary;
  static const Color royalBlue = Color(0xFF4169E1);
  static const Color steelBlue = Color(0xFF4682B4);
  static const Color cornflowerBlue = Color(0xFF6495ED);
  static const Color darkTurquoise = Color(0xFF00CED1);
  static const Color paretoRed = error;
  static const Color detallistaGray = textSecondary;
  static const Color dimGray = Color(0xFF696969);
  static const Color darkBackground = Color(0xFF1C1C1E);
  static const Color snow = Color(0xFFFFFFFF);
  
  static const Color inputBorder = border;
  static const Color secondaryText = textSecondary;
  static const Color primaryText = textPrimary;
  static const Color dimGrayBorder = border;
}