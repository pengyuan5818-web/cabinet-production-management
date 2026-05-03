process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const app = require('./src/index');
const_inspect = app._router ? (app._router.stack || []).map(r => r.route || r.name || JSON.stringify(r)) : 'no router';
console.log('Middleware stack length:', app._router?.stack?.length);
console.log('Registered routes:');
app._router?.stack?.forEach((r, i) => {
  if (r.route) {
    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
    console.log(`  ${i}: ${methods} ${r.route.path}`);
  } else if (r.name === 'router') {
    console.log(`  ${i}: [Router] ${r.regexp}`);
  } else {
    console.log(`  ${i}: [Middleware] ${r.name || r.handle?.name || 'anonymous'}`);
  }
});
process.exit(0);
