import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reponedor_mobile/main.dart';

void main() {
  testWidgets('Login screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(const FieldOpsApp());

    expect(find.text('TRACE V'), findsOneWidget);
    expect(find.text('OPERACIONES LOGÍSTICAS'), findsOneWidget);
    expect(find.text('INICIAR SESIÓN'), findsOneWidget);
    expect(find.byType(Image), findsOneWidget);
  });
}
