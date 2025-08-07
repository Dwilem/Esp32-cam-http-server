const http = require('http');
const fs = require('fs');
const path = require('path');

const serverPort = 42101; // Use 8080 (or any free port)
const streamDirectory = './stream';
const streamFilename = 'stream.jpg';

// Set your login credentials
const USERNAME = 'admin';
const PASSWORD = 'admin123';

let streamingEnabled = true;

// Basic Authentication
function authenticate(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure Area"' });
    res.end('Authentication required');
    return false;
  }
  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const [user, pass] = auth;

  if (user === USERNAME && pass === PASSWORD) {
    return true;
  } else {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure Area"' });
    res.end('Invalid credentials');
    return false;
  }
}

function authenticate(req, res) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end('Authentication required');
    return false;
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const [user, pass] = auth;

  if (user === USERNAME && pass === PASSWORD) {
    // ✅ Even when successful, prevent browser caching credentials
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return true;
  } else {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end('Invalid credentials');
    return false;
  }
}

const server = http.createServer((req, res) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  console.log(`Headers:`, req.headers);

  if (req.method === 'POST' && req.url === '/upload') {
    // Log incoming image size
    let data = [];
    req.on('data', chunk => {
      data.push(chunk);
      console.log(`Received chunk: ${chunk.length} bytes`);
    });
    req.on('end', () => {
      const buffer = Buffer.concat(data);
      console.log(`Total upload size: ${buffer.length} bytes`);
      fs.writeFile(path.join(streamDirectory, streamFilename), buffer, err => {
        if (err) {
          console.error('Failed to save image:', err);
          res.writeHead(500);
          res.end('Failed to save image');
        } else {
          console.log('Image uploaded and saved successfully.');
          if (streamingEnabled)
            res.writeHead(200);
          else
            res.writeHead(201);
          res.end('Image uploaded successfully');
        }
      });
    });
    return;
  }

  if (!authenticate(req, res)) return;

  if (req.url === '/') {
    // Serve HTML page
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

          function refreshImage() {
            const img = document.getElementById('stream');
            img.src = '/stream?t=' + new Date().getTime();
          }

          async function updateStatus() {
            try {
              const res = await fetch('/status');
              const json = await res.json();
              const statusElem = document.getElementById('status');
              statusElem.textContent = json.streaming ? 'Streaming: ON' : 'Streaming: OFF';
              statusElem.style.color = json.streaming ? 'lime' : 'red';
            } catch (e) {
              console.error('Failed to update status', e);
            }
          }

          setInterval(refreshImage, 80);
          setInterval(updateStatus, 2000); // check status every second
          window.onload = updateStatus;
        </script>


      </head>
      <body style="background:#222; text-align:center; color:white;">
        <h1>ESP32-CAM Live Stream</h1>
          <div id="status" style="font-weight:bold; margin-bottom:10px;">Streaming: ...</div>
          <div style="margin-bottom: 20px;">
            <button onclick="sendCommand('/start')">Start Stream</button>
            <button onclick="sendCommand('/stop')">Stop Stream</button>
          </div>
          <img id="stream" src="/stream" style="max-width:100%; border:2px solid white;">

      </body>
    </html>

    `);
  } else if (req.url.startsWith('/stream')) {
  const filePath = path.join(streamDirectory, streamFilename);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Stream not found');
    }
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}


else if (req.url === '/start' && req.method === 'POST') {
  if (!authenticate(req, res)) return;
  streamingEnabled = true;
  res.end('Streaming started');
  console.log('Streaming enabled');
}

else if (req.url === '/stop' && req.method === 'POST') {
  if (!authenticate(req, res)) return;
  streamingEnabled = false;
  res.end('Streaming stopped');
  console.log('Streaming disabled');
}

else if (req.url === '/status') {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ streaming: streamingEnabled }));
}

 else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

if (!fs.existsSync(streamDirectory)) {
  fs.mkdirSync(streamDirectory);
}

// Listen on all interfaces (important!)
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${serverPort}`);
});