const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT = path.join(__dirname, 'dist', 'web');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'application/octet-stream';
  
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': mime, 'Access-Control-Allow-Origin': '*'});
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end('Not found: ' + urlPath);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log('Static server: http://localhost:' + PORT);
});
