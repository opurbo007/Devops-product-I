@echo off
setlocal
REM ============================================================
REM Full-stack dev launcher (Windows).
REM Run from the repo root:  start-all.bat
REM
REM Starts, in order:
REM   1. Infra only (Postgres, Zookeeper, Kafka, Redis, Prometheus, Grafana)
REM      App services run locally via npm, so Docker must NOT start them
REM      (their containers just crash and would steal ports 3000-3005/8081).
REM   2. Prisma migrations for every service DB (+ inventory seed)
REM   3. API gateway :8081 + 6 microservices :3000-:3005 (tabs in Windows Terminal)
REM   4. Storefront :3006 + admin dashboard :3007 (tabs in Windows Terminal)
REM NOTE: `call` is required before npm or the script would not continue.
REM ============================================================
set ROOT=%~dp0

REM Windows Terminal (a Store app) cannot be launched from an elevated shell,
REM so "Run as administrator" breaks wt with 0x80070002. Nothing here needs
REM admin rights (all ports are above 1024; Docker Desktop is per-user).
net session >nul 2>nul
if not errorlevel 1 (
  echo [ERROR] Do NOT run this as Administrator. Double-click it normally.
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker not found in PATH. Install Docker Desktop first.
  pause
  exit /b 1
)

echo === 1/4 Infra: docker compose up (infra services only) ===
cd /d "%ROOT%infrastructure"
docker compose up -d postgres zookeeper kafka redis prometheus grafana
if errorlevel 1 (
  echo [ERROR] docker compose up failed.
  pause
  exit /b 1
)

echo Waiting 30s for Postgres + Kafka to become ready...
timeout /t 30 /nobreak >nul

echo === 2/4 Prisma migrations (one per service DB) ===
cd /d "%ROOT%api-gateway"
call npm run db:migrate
cd /d "%ROOT%services\order-service"
call npm run db:migrate
cd /d "%ROOT%services\inventory-service"
call npm run db:migrate
call npm run seed
cd /d "%ROOT%services\shipping-service"
call npm run db:migrate
cd /d "%ROOT%services\payment-service"
call npm run db:migrate
cd /d "%ROOT%services\notification-service"
call npm run db:migrate
cd /d "%ROOT%services\cart-recommendation-service"
call npm run db:migrate

where wt >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows Terminal wt.exe not found. Install Windows Terminal from the Microsoft Store.
  pause
  exit /b 1
)

echo === 3/4 Backend + 4/4 frontends: one Windows Terminal window, 9 tabs ===
wt new-tab -d "%ROOT%api-gateway" --title "api-gateway :8081" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\order-service" --title "order-service :3000" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\inventory-service" --title "inventory-service :3001" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\shipping-service" --title "shipping-service :3002" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\payment-service" --title "payment-service :3003" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\notification-service" --title "notification-service :3004" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%services\cart-recommendation-service" --title "cart-service :3005" powershell -NoExit -NoProfile -Command npm run dev ";" new-tab -d "%ROOT%frontend\storefront" --title "storefront :3006" powershell -NoExit -NoProfile -Command npm run dev -- --port 3006 ";" new-tab -d "%ROOT%frontend\admin-dashboard" --title "admin-dashboard :3007" powershell -NoExit -NoProfile -Command npm run dev -- --port 3007

echo.
echo All launched:
echo   Gateway:         http://localhost:8081/health
echo   Storefront:      http://localhost:3006
echo   Admin dashboard: http://localhost:3007/login
echo   Grafana:         http://localhost:3100   Prometheus: http://localhost:9090
echo.
echo First run? If a tab reports missing modules, run "npm install" in its folder once.
echo To stop servers close the tabs; to stop infra run:  cd infrastructure ^&^& docker compose down
endlocal
