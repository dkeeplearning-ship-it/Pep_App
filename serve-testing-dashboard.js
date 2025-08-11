#!/usr/bin/env node

/**
 * Simple HTTP server to serve the testing dashboard
 * This avoids CORS issues when running HTML files directly in browser
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8888;
const HOST = 'localhost';

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>404 Not Found</title></head>
          <body>
            <h1>404 - File Not Found</h1>
            <p>The requested file <code>${filePath}</code> was not found.</p>
            <p><a href="/">Go back to testing dashboard</a></p>
          </body>
        </html>
      `);
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle root path
  if (pathname === '/') {
    pathname = '/testing-dashboard.html';
  }

  // Security: prevent directory traversal
  if (pathname.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>400 Bad Request</title></head>
        <body>
          <h1>400 - Bad Request</h1>
          <p>Invalid path requested.</p>
        </body>
      </html>
    `);
    return;
  }

  // Remove leading slash and resolve file path
  const fileName = pathname.substring(1);
  const filePath = path.join(__dirname, fileName);

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist, try some common alternatives
      const alternatives = [
        'testing-dashboard.html',
        'test-batch-completion.html',
        'docs/testing/COMPLETE_TESTING_WORKFLOW.md',
        'docs/testing/TESTING_SUMMARY.md'
      ];

      // If requesting a specific file that doesn't exist, show directory listing
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <title>PEP Score Nexus - Testing Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .file-list { list-style: none; padding: 0; }
              .file-list li { margin: 10px 0; }
              .file-list a { text-decoration: none; color: #667eea; font-weight: bold; }
              .file-list a:hover { text-decoration: underline; }
              .description { color: #666; font-size: 14px; margin-left: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎯 PEP Score Nexus Testing Server</h1>
              <p>Available testing tools and documentation</p>
            </div>
            
            <h2>📋 Available Testing Tools</h2>
            <ul class="file-list">
              <li>
                <a href="/testing-dashboard.html">🎮 Interactive Testing Dashboard</a>
                <div class="description">Comprehensive visual testing interface with real-time results</div>
              </li>
              <li>
                <a href="/test-batch-completion.html">🔧 Batch Completion Test</a>
                <div class="description">Specific test for batch completion functionality</div>
              </li>
              <li>
                <a href="/docs/testing/COMPLETE_TESTING_WORKFLOW.md">📖 Complete Testing Workflow</a>
                <div class="description">Detailed step-by-step testing documentation</div>
              </li>
              <li>
                <a href="/docs/testing/TESTING_SUMMARY.md">📊 Testing Summary</a>
                <div class="description">Overview of testing tools and procedures</div>
              </li>
            </ul>
            
            <h2>🚀 Quick Start</h2>
            <ol>
              <li>Start with the <a href="/testing-dashboard.html">Interactive Testing Dashboard</a></li>
              <li>Click "Run All Tests" or test individual components</li>
              <li>Review results and export reports as needed</li>
            </ol>
            
            <h2>🔧 Server Information</h2>
            <ul>
              <li><strong>Testing Server:</strong> http://localhost:${PORT}</li>
              <li><strong>Backend API:</strong> http://localhost:3001</li>
              <li><strong>Frontend App:</strong> http://localhost:8080</li>
            </ul>
            
            <p><em>This server resolves CORS issues when testing HTML files directly.</em></p>
          </body>
        </html>
      `);
      return;
    }

    // File exists, serve it
    serveFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🎯 PEP Score Nexus Testing Server`);
  console.log(`🌐 Server running at http://${HOST}:${PORT}/`);
  console.log(`📋 Testing Dashboard: http://${HOST}:${PORT}/testing-dashboard.html`);
  console.log(`🔧 Batch Test: http://${HOST}:${PORT}/test-batch-completion.html`);
  console.log(`📖 Documentation: http://${HOST}:${PORT}/docs/testing/`);
  console.log(`\n✅ No CORS issues - ready for testing!`);
  console.log(`\n🚀 Quick start: Open http://${HOST}:${PORT}/ in your browser`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing server.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down testing server...');
  server.close(() => {
    console.log('✅ Testing server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down testing server...');
  server.close(() => {
    console.log('✅ Testing server stopped');
    process.exit(0);
  });
});
