@echo off
echo.
echo ============================================================
echo   Academia Seed -- Migracoes + Dados Ficticios
echo ============================================================
echo.

REM Verifica se o container esta rodando
docker ps --filter "name=whatsapp_saas_web" --format "{{.Names}}" | findstr whatsapp_saas_web >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Container whatsapp_saas_web nao esta rodando.
    echo        Execute primeiro: docker compose up -d
    echo.
    pause
    exit /b 1
)

echo [1/3] Rodando planos base (se ainda nao existem)...
docker exec -e DIRECT_URL=postgresql://postgres:postgres@postgres:5432/postgres whatsapp_saas_web node prisma/seed.mjs
echo       OK!
echo.

echo [2/3] Copiando seed de academia para o container...
docker cp "%~dp0prisma\seed-academia.mjs" whatsapp_saas_web:/app/prisma/seed-academia.mjs
echo       OK!
echo.

echo [3/3] Rodando seed de academia...
docker exec -e DIRECT_URL=postgresql://postgres:postgres@postgres:5432/postgres -e SEED_EMAIL=academia.20260612134850@pyralabs.local whatsapp_saas_web node prisma/seed-academia.mjs
if %errorlevel% neq 0 (
    echo [ERRO] Falha no seed. Verifique os logs acima.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Pronto!
echo   Acesse: http://localhost:3000/dashboard/academia
echo ============================================================
echo.
pause
