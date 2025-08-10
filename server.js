/**
 * ESP32-CAM Remote Streaming Server
 * - HTTP server for ESP uploads (Basic Auth)
 * - HTTPS server for browser viewing (separate Custom Auth)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ================== CONFIGURATION ==================

// Stream storage
const streamDirectory = './stream';
const streamFilename = 'stream.jpg';

// HTTP port for ESP uploads
const HTTP_PORT = 42101;

// HTTPS port for browser access
const HTTPS_PORT = 443;

// ESP32-CAM credentials (for uploads)
const CAM_USER = 'espuser';
const CAM_PASS = 'esppass';

// Browser credentials (for viewing)
const WEB_USER = 'admin';
const WEB_PASS = 'secret';

// HTTPS certificate & key
/*
mkdir cert
openssl req -nodes -new -x509 -keyout cert/key.pem -out cert/cert.pem
*/

const sslOptions = {
  key: fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
};

// Streaming control
let streamingEnabled = true;

// Ensure stream directory exists
if (!fs.existsSync(streamDirectory)) {
  fs.mkdirSync(streamDirectory);
}

// ================== AUTH FUNCTIONS ==================

function authenticateESP(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="ESP32 Upload"' });
    res.end('ESP authentication required');
    return false;
  }
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString()
    .split(':');
  if (user === CAM_USER && pass === CAM_PASS) return true;

  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="ESP32 Upload"' });
  res.end('Invalid ESP credentials');
  return false;
}

function authenticateBrowser(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="ESP32-CAM Secure Stream"',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache'
    });
    res.end('Authentication required');
    return false;
  }
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString()
    .split(':');
  if (user === WEB_USER && pass === WEB_PASS) return true;

  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="ESP32-CAM Secure Stream"',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache'
  });
  res.end('Invalid browser credentials');
  return false;
}

// ================== HTTP SERVER (ESP UPLOADS) ==================

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    if (!authenticateESP(req, res)) return;

    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(data);
      fs.writeFile(path.join(streamDirectory, streamFilename), buffer, err => {
        if (err) {
          res.writeHead(500);
          res.end('Error saving image');
        } else {
          res.writeHead(streamingEnabled ? 200 : 201); // 200 - Ok; 201 - Stop streaming
          res.end('OK');
        }
      });
    });
  } else {
    res.writeHead(403);
    res.end('Forbidden');
  }
}).listen(HTTP_PORT, () => {
  console.log(`HTTP server (ESP uploads) running on port ${HTTP_PORT}`);
});

// ================== HTTPS SERVER (BROWSER VIEWING) ==================

https.createServer(sslOptions, (req, res) => {
  if (!authenticateBrowser(req, res)) return;

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>ESP32-CAM Stream</title>
          <script>
            async function sendCommand(endpoint) {
              await fetch(endpoint, { method: 'POST' });
              updateStatus();
            }

            async function updateStatus() {
              const res = await fetch('/status');
              const data = await res.json();
              document.getElementById('status').innerText =
                data.streaming ? 'Streaming: ON' : 'Streaming: OFF';
            }

            function refreshImage() {
              const img = document.getElementById('stream');
              img.src = '/stream?t=' + new Date().getTime();
            }

            setInterval(() => {
              updateStatus();
              refreshImage();
            }, 1000);

            window.onload = updateStatus;
          </script>
        </head>
        <body style="background:#222; text-align:center; color:white;">
          <h1>ESP32-CAM Live Stream</h1>
          <div id="status" style="margin-bottom: 10px;">Loading...</div>
          <div style="margin-bottom: 20px;">
            <button onclick="sendCommand('/start')">Start Stream</button>
            <button onclick="sendCommand('/stop')">Stop Stream</button>
          </div>
          <img src="/stream" style="max-width:100%; border:2px solid white;">
        </body>
      </html>
    `);
  }

  else if (req.url === '/stream') {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache'
  });

  const sendFrame = () => {
    const filePath = path.join(streamDirectory, streamFilename);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error('Error reading frame:', err);
        return; // skip sending if error
      }

      res.write(`--frame\r\n`);
      res.write(`Content-Type: image/jpeg\r\n`);
      res.write(`Content-Length: ${data.length}\r\n\r\n`);
      res.write(data);
      res.write('\r\n');
    });
  };

  const interval = setInterval(sendFrame, 100); // 10 FPS

  req.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected from MJPEG stream');
  });
}


  else if (req.url === '/start' && req.method === 'POST') {
    streamingEnabled = true;
    res.end('Streaming started');
  }

  else if (req.url === '/stop' && req.method === 'POST') {
    streamingEnabled = false;
    res.end('Streaming stopped');
  }

  else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ streaming: streamingEnabled }));
  }

  else {
    res.writeHead(404);
    res.end('Not Found');
  }

}).listen(HTTPS_PORT, () => {
  console.log(`HTTPS server (Browser viewing) running on port ${HTTPS_PORT}`);
});
