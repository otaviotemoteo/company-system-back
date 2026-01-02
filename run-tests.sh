#!/bin/bash

# 📊 Script para rodar todos os testes do projeto
# Use: bash run-tests.sh [opção]

set -e  # Exit se algum comando falhar

echo "🧪 Project Manager - Suite de Testes"
echo "===================================="
echo ""

if [ "$1" == "unit" ] || [ "$1" == "u" ]; then
  echo "▶️  Rodando testes UNITÁRIOS..."
  npm test -- src/tests/unit
  
elif [ "$1" == "integration" ] || [ "$1" == "i" ]; then
  echo "▶️  Rodando testes de INTEGRAÇÃO..."
  npm test -- src/tests/integration
  
elif [ "$1" == "all" ] || [ "$1" == "a" ] || [ -z "$1" ]; then
  echo "▶️  Rodando TODOS os testes..."
  npm test
  
elif [ "$1" == "watch" ] || [ "$1" == "w" ]; then
  echo "▶️  Modo WATCH (atualiza ao salvar)..."
  npm test -- --watch
  
elif [ "$1" == "coverage" ] || [ "$1" == "c" ]; then
  echo "▶️  Gerando COBERTURA de código..."
  npm test -- --coverage
  
elif [ "$1" == "ui" ]; then
  echo "▶️  Abrindo INTERFACE de testes..."
  npm test -- --ui
  
elif [ "$1" == "help" ] || [ "$1" == "h" ] || [ "$1" == "-h" ]; then
  echo "Opções disponíveis:"
  echo ""
  echo "  npm run test:unit              # Testes unitários"
  echo "  npm run test:integration       # Testes de integração"
  echo "  npm run test:all               # Todos os testes"
  echo "  npm run test:watch             # Modo watch"
  echo "  npm run test:coverage          # Cobertura de código"
  echo "  npm run test:ui                # Interface visual"
  echo ""
  echo "Exemplos:"
  echo "  npm test -- src/tests/unit/password.test.ts"
  echo "  npm test -- -t 'deve validar'"
  echo ""
else
  echo "❌ Opção inválida: $1"
  echo "Use: bash run-tests.sh [unit|integration|all|watch|coverage|ui|help]"
  exit 1
fi

echo ""
echo "✅ Testes completados!"
