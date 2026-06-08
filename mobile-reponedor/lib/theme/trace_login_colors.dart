import 'package:flutter/material.dart';

class TraceLoginColors {
  TraceLoginColors._();

  // --- PALETA BASE (Los tonos puros) ---
  static const Color _redBase = Color(0xFFAA001B);
  static const Color _greyBase = Color(0xFF5E5E5E);

  // --- COLORES PRIMARIOS (Gama de rojos) ---
  static const Color primary = _redBase;
  static const Color primaryContainer = Color(0xFFD11F2D); // Rojo más vibrante
  static const Color primaryLight = Color(0xFFFDE6E9);   // Rojo muy suave para fondos
  static const Color primaryDark = Color(0xFF7A0014);    // Rojo intenso para acentos/hover

  // --- COLORES DE SUPERFICIE Y FONDO ---
  static const Color surface = Color(0xFFF9F9F9);
  static const Color surfaceDim = Color(0xFFEFEFEF);     // Para contenedores con relieve
  static const Color onSurface = Color(0xFF1A1C1C);      // Texto principal
  static const Color onSurfaceVariant = Color(0xFF5C403E); // Texto secundario

  // --- COLORES SECUNDARIOS Y NEUTRALES ---
  static const Color secondary = _greyBase;
  static const Color outline = Color(0xFFD1D1D1);        // Para bordes de inputs
  static const Color onPrimary = Color(0xFFFFFFFF);      // Texto sobre botones rojos

  // --- ESTADOS Y FEEDBACK (Muy importante para futuras funciones) ---
  static const Color error = Color(0xFFBA1A1A);
  static const Color success = Color(0xFF0F8C56);
  static const Color warning = Color(0xFFFFB300);
  static const Color info = Color(0xFF00639B);

  // --- MANTENEMOS TU REFERENCIA ---
  static const Color headerRed = Color(0xFFA51D24);
}
