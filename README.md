# ESP32-CAM Remote Stream

A minimal Node.js server that receives image frames from an ESP32-CAM and streams them to a password-protected browser interface — accessible from anywhere in the world.  
No cloud services, no complex setup — just raw image pushing and live viewing.

---

## 🛠️ Why This Project Is Cool

Turn a $5 ESP32-CAM into a secure, remotely accessible streaming camera using only simple web technologies.  
It works across different networks, supports authentication, and lets you control the stream from your browser.

---

## ⚙️ Setup

### Server (Node.js)

1. **Install Node.js**  
   https://nodejs.org/

2. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/esp32-cam-remote-stream.git
   cd esp32-cam-remote-stream
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Modify script according to your needs**
   
   Change ```server.js``` login credentials, server port. In ```Esp32Camera.ino``` add server ip, port, login credentials, wifi...
   If you want to use server publicly don't forget to portforward
   

5. **Run the server**
   ```bash
   node server.js
   ```

6. **Access in browser**
   Visit: `http://<your-server-ip>:42101`  
   Login using the username/password set in `server.js`.


---

## 🔐 Authentication

- HTTP Basic Auth required for browser access
- Credentials set in `server.js`
- Login prompt appears on every session (no caching)

---

## 🔁 Update Possibilities

- MJPEG stream or WebSocket for smoother video
- Add image recording or cloud sync
- Support multiple cameras/devices
- Use HTTPS (TLS) for secure access
- Mobile-friendly interface

---

## 🧪 Tested On

- Node.js v18+
- ESP32-CAM AI-Thinker
- Firefox, Chrome

---

## 📜 License

MIT License – free to use, modify, and share.
