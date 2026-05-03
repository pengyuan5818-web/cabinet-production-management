from subprocess import run, PIPE
import json

result = run(['powershell', '-Command', '''
Set-Location "C:\\Users\\Administrator\\Desktop\\橱柜工厂管理系统\\src\\backend"
$env:PGPASSWORD = "postgres"
$rows = psql -h localhost -U postgres -d cabinet_factory -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
$rows -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
'''], capture_output=True, text=True)

tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]
print('\n'.join(tables))
