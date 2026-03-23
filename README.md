# 🔗 ConnectX — Random Video Chat

> Connect with strangers instantly via peer-to-peer video — no sign-up required.

🌐 **Live:** [https://connect-x.root.sx](https://connect-x.root.sx)

---

## ✨ Features

- ⚡ **Instant matching** — get paired with a random user automatically
- 📹 **Peer-to-peer video & audio** via WebRTC (no media relayed through server)
- 💬 Real-time signaling over WebSockets (Socket.IO)
- 🔄 Auto-reconnect flow when a partner disconnects
- 🌍 Works across networks via STUN/ICE negotiation
- 📱 Responsive — works on desktop and mobile browsers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web Framework | Express |
| Real-time Signaling | Socket.IO |
| Video/Audio | WebRTC (browser-native) |
| Reverse Proxy | Nginx |
| Hosting | AWS EC2 |

---

## 🚀 Getting Started (Self-host)

### Prerequisites

- Node.js v18+
- npm
- An AWS EC2 instance (or any Linux VPS)
- A domain pointing to your server

### 1. Clone the repo

```bash
git clone https://github.com/your-username/connect-x.git
cd connect-x
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the server

```bash
node server.js
```

Server starts at `http://localhost:3000` by default.

To use a different port:

```bash
PORT=8080 node server.js
```

---

## ☁️ Deployment (AWS EC2 + Nginx)

### EC2 Setup

1. Launch an EC2 instance (Ubuntu 22.04 LTS recommended)
2. Open inbound ports: `22` (SSH), `80` (HTTP), `443` (HTTPS)
3. SSH into the instance and install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Clone the repo and install dependencies (see above)
5. Run the app with a process manager:

```bash
sudo npm install -g pm2
pm2 start server.js --name connect-x
pm2 save
pm2 startup
```

### Nginx Configuration

Install Nginx and configure it as a reverse proxy:

```bash
sudo apt install nginx
```

Create `/etc/nginx/sites-available/connect-x`:

```nginx
server {
    listen 80;
    server_name connect-x.root.sx;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/connect-x /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL (HTTPS) with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d connect-x.root.sx
```

Certbot will automatically update your Nginx config for HTTPS and set up auto-renewal.

---

## ⚙️ How It Works

```
User A connects → Socket.IO → Server
User B connects → Socket.IO → Server
                              ↓
                     Server pairs A & B
                     A gets isCaller: true
                     B gets isCaller: false
                              ↓
         A creates WebRTC offer → Server → B
         B creates WebRTC answer → Server → A
         ICE candidates exchanged via Server
                              ↓
              Peer-to-peer video stream established
              (media flows directly between browsers)
```

The server only handles **signaling** — actual video/audio data travels directly between browsers via WebRTC.

---

## 📁 Project Structure

```
connect-x/
├── server.js          # Express + Socket.IO signaling server
├── public/
│   ├── index.html     # Frontend UI
│   ├── client.js      # WebRTC + Socket.IO client logic
│   └── style.css      # Styles
└── package.json
```

---

## 🔒 Privacy

- No accounts, no logins, no data stored
- Video and audio are peer-to-peer — the server never sees your media
- Rooms are ephemeral and destroyed when either user disconnects

---

## 📄 License

MIT License — free to use, modify, and deploy.
