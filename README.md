# ESP32-CAM Remote Stream

A minimal Node.js server that receives image frames from an ESP32-CAM and streams them to a password-protected browser interface — accessible from anywhere in the world.  
No cloud services, no complex setup — just raw image pushing and live viewing.

---

## 🛠️ Why This Project Is Cool

Turn a $5 ESP32-CAM into a secure, remotely accessible streaming camera using only simple web technologies.  
It works across different networks, supports authentication, and lets you control the stream from your browser.

---

## ⚙️ Setup

1. **Install Node.js**  
   https://nodejs.org/

2. **Clone the repository**
   ```bash
   git clone https://github.com/Dwilem/Esp32-cam-http-server.git
   cd esp32-cam-remote-stream
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Modify script according to your needs**
   
   Change ```server.js``` login credentials, server port. In ```Esp32Camera.ino``` add server ip, port, login credentials, wifi...
   If you want to use server publicly don't forget to portforward
   
5. **Generate certificate and a key**
   ```bash
   mkdir cert
   openssl req -nodes -new -x509 -keyout cert/key.pem -out cert/cert.pem
   ```

6. **Run the server**
   ```bash
   node server.js
   ```
   
7. **Run arduino ide script**
   
   Upload ```Esp32Camera.ino``` code into arduino

8. **Access in browser**
   Visit: `http://<your-server-ip>:<port>`  
   Login using the username/password set in `server.js`.


---

## 🔐 Authentication

- HTTPS Basic Auth required for browser access
- Credentials set in `server.js`
- Login prompt appears on every session (no caching)

---

## 🔁 Update Possibilities

- Add image recording or cloud sync
- Support multiple cameras/devices
- Mobile-friendly interface

---

## 🧪 Tested On

- Node.js v18+
- ESP32-CAM AI-Thinker
- Firefox, Chrome

---

## 📜 License

MIT License – free to use, modify, and share.
