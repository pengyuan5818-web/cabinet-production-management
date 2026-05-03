@echo off
echo Starting Cpolar Tunnels (Web + API)...
echo.

:: 启动前端隧道 (Web)
start "cpolar-web" /min "C:\Program Files\cpolar\cpolar.exe" http --subdomain=feniercabinets --authtoken=YjVjYjJmNTQtNzNhYS00MDQxLTk0MmMtYmE0Nzg1ZWJjOWQ3 --region=cn --daemon=on localhost:5174

timeout /t 2 /nobreak >nul

:: 启动后端隧道 (API)
start "cpolar-api" /min "C:\Program Files\cpolar\cpolar.exe" http --subdomain=feniercabinets-api --authtoken=YjVjYjJmNTQtNzNhYS00MDQxLTk0MmMtYmE0Nzg1ZWJjOWQ3 --region=cn --daemon=on localhost:3000

echo Done! Tunnels are running in background.
echo.
echo Web:  https://feniercabinets.cpolar.cn/
echo API:  https://feniercabinets-api.cpolar.cn/
echo.
echo Press any key to close this window (tunnels will keep running)...
pause >nul
