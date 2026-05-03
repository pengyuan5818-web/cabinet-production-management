import urllib.request, json

BASE = 'http://localhost:3000'

def get(path):
    try:
        req = urllib.request.Request(f'{BASE}{path}')
        req.add_header('Authorization', 'Bearer test-token')
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except Exception as e:
        return 'ERR', str(e)

# Test core routes
tests = [
    ('/api/orders?page=1&page_size=1', 'GET /api/orders'),
    ('/api/customer?page=1&page_size=1', 'GET /api/customer'),
    ('/api/warehouse/summary', 'GET /api/warehouse/summary'),
    ('/api/quality/list?page=1', 'GET /api/quality/list'),
    ('/api/package/list?page=1', 'GET /api/package/list'),
    ('/api/sort/tasks?page=1', 'GET /api/sort/tasks'),
    ('/api/installation?page=1', 'GET /api/installation'),
    ('/api/receivable/list?page=1', 'GET /api/receivable/list'),
    ('/api/design/drawings?page=1', 'GET /api/design/drawings'),
    ('/api/quote/list?page=1', 'GET /api/quote/list'),
    ('/api/exchange-rates', 'GET /api/exchange-rates'),
]

for path, name in tests:
    status, data = get(path)
    ok = '✅' if status == 200 else '❌'
    msg = data.get('message', '') if isinstance(data, dict) else str(data)[:60]
    print(f"{ok} {name}: {status} | {msg}")
