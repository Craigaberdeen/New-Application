const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

function createServer(root = path.join(__dirname, 'public')) {
  root = path.resolve(root);
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Method not allowed');
    }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split('?')[0]); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    try {
      const data = await fs.readFile(file);
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}
if (require.main === module) {
  const root = process.env.SERVE_DIST === '1' ? path.join(__dirname, 'dist') : undefined;
  createServer(root).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Cabline is running'));
}
module.exports = { createServer };
