#!/bin/bash
# deploy.sh — atualiza e reinicia os serviços na VPS
# Uso: ./deploy.sh [bot|web|all]
set -e

TARGET=${1:-all}
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> git pull"
git pull origin main

if [[ "$TARGET" == "bot" || "$TARGET" == "all" ]]; then
  echo "==> rebuild bot"
  $COMPOSE up -d --build --no-deps bot
fi

if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
  echo "==> rebuild web (inclui migrações)"
  $COMPOSE up -d --build --no-deps migrator
  $COMPOSE wait migrator
  $COMPOSE up -d --build --no-deps web
fi

echo "==> status final"
$COMPOSE ps
echo ""
echo "==> logs recentes do bot"
$COMPOSE logs bot --tail=20
