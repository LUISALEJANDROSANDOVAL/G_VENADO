import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Tema Material 3 personalizado para FieldOps Reponedores (Light Theme Premium).
class AppTheme {
  AppTheme._();

  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.light(
      primary: AppColors.institutionalBlue,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primaryRedAccent,
      secondary: AppColors.activeBlue,
      onSecondary: Colors.white,
      surface: AppColors.cardBackground,
      onSurface: AppColors.primaryText,
      error: AppColors.error,
      onError: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.darkBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primaryText,
        elevation: 0.5,
        shadowColor: AppColors.inputBorder,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.primaryText,
          letterSpacing: 0.5,
        ),
        iconTheme: IconThemeData(color: AppColors.primaryText),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardBackground,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.inputBorder, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.institutionalBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.activeBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.institutionalBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: const TextStyle(color: AppColors.secondaryText, fontSize: 14),
        hintStyle: const TextStyle(color: AppColors.textLightGrey, fontSize: 14),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        labelStyle: const TextStyle(color: AppColors.primaryText, fontSize: 13, fontWeight: FontWeight.w500),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: const BorderSide(color: AppColors.inputBorder),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.institutionalBlue,
        foregroundColor: Colors.white,
        elevation: 4,
        extendedSizeConstraints: BoxConstraints(minHeight: 56),
        extendedPadding: EdgeInsets.symmetric(horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.institutionalBlue;
          }
          return Colors.white;
        }),
        side: const BorderSide(color: AppColors.textLightGrey, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      dividerColor: AppColors.inputBorder,
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: AppColors.primaryText,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: AppColors.primaryText,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.primaryText,
        ),
        bodyLarge: TextStyle(fontSize: 16, color: AppColors.primaryText, fontWeight: FontWeight.normal),
        bodyMedium: TextStyle(fontSize: 14, color: AppColors.primaryText, fontWeight: FontWeight.normal),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.secondaryText, fontWeight: FontWeight.normal),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: AppColors.primaryText,
        ),
      ),
    );
  }
}

