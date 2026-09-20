@echo off
setlocal
REM ============================================================
REM Full-stack dev launcher (Windows).
REM Run from the repo root:  start-all.bat
REM
REM Starts, in order:
REM   1. Infra (Postgres, Zookeeper, Kafka, Redis, Prometheus, Grafana)
REM   2. Prisma migrations for every service DB (+ inventory seed)
REM   3. API gateway :8081 + 6 microservices :3000-:3005 (one window each)
REM   4. Storefront :3006 + admin dashboard :3007 (one window each)
REM NOTE: `call` is required before npm or the script would not continue.
REM ============================================================
set ROOT=%~dp0

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker not found in PATH. Install Docker Desktop first.
  pause
  exit /b 1
)

echo === 1/4 Infra: docker compose up ===
cd /d "%ROOT%infrastructure"
docker compose up -d
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

echo === 3/4 Backend services (each in its own window) ===
start "api-gateway :8081" cmd /k "cd /d %ROOT%api-gateway && call npm run dev"
start "order-service :3000" cmd /k "cd /d %ROOT%services\order-service && call npm run dev"
start "inventory-service :3001" cmd /k "cd /d %ROOT%services\inventory-service && call npm run dev"
start "shipping-service :3002" cmd /k "cd /d %ROOT%services\shipping-service && call npm run dev"
start "payment-service :3003" cmd /k "cd /d %ROOT%services\payment-service && call npm run dev"
start "notification-service :3004" cmd /k "cd /d %ROOT%services\notification-service && call npm run dev"
start "cart-service :3005" cmd /k "cd /d %ROOT%services\cart-recommendation-service && call npm run dev"

echo === 4/4 Frontends (each in its own window) ===
start "storefront :3006" cmd /k "cd /d %ROOT%frontend\storefront && call npm run dev -- --port 3006"
start "admin-dashboard :3007" cmd /k "cd /d %ROOT%frontend\admin-dashboard && call npm run dev -- --port 3007"

echo.
echo All launched:
echo   Gateway:         http://localhost:8081/health
echo   Storefront:      http://localhost:3006
echo   Admin dashboard: http://localhost:3007/login
echo   Grafana:         http://localhost:3100   Prometheus: http://localhost:9090
echo.
echo First run? If a service window reports missing modules, run "npm install" in its folder once.
echo To stop backends/frontends close their windows; to stop infra run:  cd infrastructure ^&^& docker compose down
endlocal
