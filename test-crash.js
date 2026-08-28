const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'out', req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    // Basic fallback for _next/static/ chunks if url is absolute
    filePath = path.join(__dirname, 'out', req.url.split('?')[0]);
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'out', req.url.split('?')[0], 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  const ext = path.extname(filePath);
  const mimeType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }[ext] || 'text/plain';
  
  res.writeHead(200, { 'Content-Type': mimeType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(3015, async () => {
  console.log('Server started on port 3015');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type().toUpperCase(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3015/', { waitUntil: 'networkidle0' });
  
  const content = await page.content();
  if (content.includes("This page couldn't load")) {
    console.log("CRASH REPRODUCED!");
  } else {
    console.log("NO CRASH. HTML snippets:");
    console.log(content.slice(0, 100));
  }
  
  await browser.close();
  server.close();
});
