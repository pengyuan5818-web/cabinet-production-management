taskkill /PID 13456 /F 2>$null
taskkill /PID 16368 /F 2>$null
Start-Sleep -Seconds 2
Start-Process node -ArgumentList "C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\index.js" -WorkingDirectory "C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend" -WindowStyle Hidden
