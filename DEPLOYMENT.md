# Spotter — Oracle Cloud VM Deployment Guide

This guide details how to deploy Spotter on an **Oracle Cloud Infrastructure (OCI) Compute Instance** (Ubuntu 22.04 / 24.04 LTS or Oracle Linux).

---

## 1. Oracle Cloud Ingress & Firewall Setup

Before logging into your VM, ensure HTTP (80) and HTTPS (443) traffic can reach the instance.

### A. OCI Virtual Cloud Network (VCN) Ingress Rule
1. In the OCI Console, navigate to **Networking** ➔ **Virtual Cloud Networks**.
2. Select your VCN and click your **Public Subnet** ➔ **Default Security List**.
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** `TCP`
   - **Destination Port Range:** `80, 443`
   - **Description:** Allow HTTP and HTTPS traffic

### B. Instance Firewall (Inside the VM)
Oracle Ubuntu instances enforce strict `iptables` rules by default. Run:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 2. Server Prerequisites

Connect to your VM via SSH:
```bash
ssh -i /path/to/your-key.key ubuntu@<YOUR_VM_PUBLIC_IP>
```

Update packages and install dependencies:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx git curl

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/RohanJaved04/Spotter.git
sudo chown -R $USER:$USER /var/www/Spotter
cd /var/www/Spotter
```

---

## 4. Backend Setup (Django + Gunicorn)

### A. Virtual Environment & Dependencies
```bash
cd /var/www/Spotter/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations and collect static files
python manage.py migrate
python manage.py collectstatic --noinput
```

### B. Configure Systemd Service for Gunicorn
Create a systemd service file:
```bash
sudo nano /etc/systemd/system/spotter-backend.service
```

Paste the following configuration:
```ini
[Unit]
Description=Spotter Django Backend Daemon
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/Spotter/backend
ExecStart=/var/www/Spotter/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 60 \
    config.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable spotter-backend
sudo systemctl start spotter-backend
sudo systemctl status spotter-backend
```

---

## 5. Frontend Build (React + Vite)

```bash
cd /var/www/Spotter/frontend
npm install
npm run build
```
This produces the optimized production bundle in `/var/www/Spotter/frontend/dist`.

---

## 6. Nginx Reverse Proxy Configuration

Remove the default Nginx site:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Create a new Nginx configuration for Spotter:
```bash
sudo nano /etc/nginx/sites-available/spotter
```

Paste the following block (replace `<YOUR_VM_PUBLIC_IP>` with your instance's public IP or domain):
```nginx
server {
    listen 80;
    server_name <YOUR_VM_PUBLIC_IP>;

    # Frontend Static Files
    location / {
        root /var/www/Spotter/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Django Admin Static Files
    location /static/ {
        alias /var/www/Spotter/backend/staticfiles/;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable the site and test the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/spotter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Verify Deployment

Open your browser and navigate to:
```
http://<YOUR_VM_PUBLIC_IP>/
```

- The Spotter interactive cockpit will load instantly.
- Test routing (e.g. **Miami, FL** to **Chicago, IL**).
- Open browser DevTools Network tab to confirm `/api/routes/plan/` returns `200 OK` via Nginx proxy.

---

## 8. Optional: Free SSL Certificate (Certbot)

If you have a domain pointed to your Oracle VM public IP:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
Certbot will automatically configure HTTPS on port 443 and handle certificate renewal.
