import subprocess
result = subprocess.run(
    ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'cabinet_factory', '-t', '-c',
     'SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\' ORDER BY table_name'],
    capture_output=True, text=True, env={**__import__('os').environ, 'PGPASSWORD': 'postgres'}
)
print(result.stdout)
if result.stderr:
    print('ERR:', result.stderr)
