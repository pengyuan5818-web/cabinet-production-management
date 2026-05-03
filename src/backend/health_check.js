const http = require('http');
function doReq(path, method = 'GET', body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path, method, headers };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, raw: d.slice(0, 100) }); } });
    });
    req.on('error', reject);
    if (body) { req.write(JSON.stringify(body)); }
    req.end();
  });
}

(async () => {
  const login = await doReq('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' }, { 'Content-Type': 'application/json' });
  const token = login.data?.data?.token;
  if (!token) { console.log('登录失败'); process.exit(1); }
  const h = { Authorization: `Bearer ${token}` };

  const routes = [
    '/api/dashboard', '/api/suppliers', '/api/employees', '/api/orders',
    '/api/finance/summary', '/api/payables', '/api/warehouse/materials',
    '/api/customers', '/api/dealers', '/api/designs', '/api/production/summary',
    '/api/quality/inspections', '/api/receivables', '/api/shipments'
  ];

  console.log('路由健康检查:\n');
  const results = [];
  for (const r of routes) {
    try {
      const res = await Promise.race([
        doReq(r, 'GET', null, h),
        new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 5000))
      ]);
      const ok = res.status < 400;
      console.log(`${ok ? '✅' : '❌'} ${r} → ${res.status}`);
      results.push({ route: r, ok, status: res.status });
    } catch (e) {
      console.log(`❌ ${r} → 错误: ${e.message}`);
      results.push({ route: r, ok: false, error: e.message });
    }
  }

  const ok = results.filter(r => r.ok).length;
  console.log(`\n${ok}/${results.length} 路由正常`);
  process.exit(ok === results.length ? 0 : 1);
})();
