// 直接测试 index.js 的路由注册情况
const path = require('path');
process.chdir(path.join(__dirname, 'src/backend'));
const index = require('./src/index');
// 等待 index.js 启动
setTimeout(() => {
  // Express app 的路由栈
  const app = index;
  console.log('Top-level routes:');
  app._router.stack.forEach(mw => {
    if (mw.name === 'router') {
      const prefix = mw.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '').replace('^', '');
      console.log(`  Mount: ${prefix}`);
      mw.handle.stack.forEach(h => {
        if (h.route) {
          console.log(`    ${Object.keys(h.route.methods).join(',').toUpperCase()} ${h.route.path}`);
        }
      });
    }
  });
  process.exit(0);
}, 1000);
