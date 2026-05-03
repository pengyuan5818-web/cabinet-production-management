import urllib.request, json

BASE = 'http://localhost:3000'

# Try without auth first for a public endpoint
def get_public(path):
    try:
        with urllib.request.urlopen(f'{BASE}{path}', timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.request.HTTPError as e:
        return e.code, e.read().decode()[:100]
    except Exception as e:
        return 'ERR', str(e)[:60]

# These should be public (no auth)
tests = [
    ('/exchange-rates', 'GET /exchange-rates (public)'),
    ('/exchange-rates/KRW', 'GET /exchange-rates/KRW (public)'),
]
for path, name in tests:
    status, data = get_public(path)
    print(f"[{status}] {name}: {str(data)[:80]}")
