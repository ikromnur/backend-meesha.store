# Panduan Deployment FULLSTACK Meesha Store ke VPS Hostinger dengan Docker

Panduan ini mencakup deployment untuk **Backend** dan **Frontend** dalam satu VPS.

## Prasyarat

1.  **VPS Hostinger** (Ubuntu 22.04/24.04).
2.  **Domain** (opsional, tapi disarankan).
3.  Akses **SSH**.

---

## Langkah 1: Persiapan VPS & Install Tools

Masuk ke VPS:

```bash
ssh root@ip_vps_anda
```

### 1. Update & Install Docker, Git, Nginx

```bash
# Update
apt update && apt upgrade -y

# Install Git & Nginx
apt install -y git nginx certbot python3-certbot-nginx

# Install Docker (Script Otomatis)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

---

## Langkah 2: Setup BACKEND

### 1. Clone & Config

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/ikromnur/backend-meesha.store.git
cd backend-meesha.store

# Setup Environment
cp .env.example .env
nano .env
```

Isi variable penting di `.env`:

- `NODE_ENV=production`
- `DATABASE_URL=...`
- `JWT_SECRET=...`
- `APP_BASE_URL=https://api.domainanda.com` (atau IP jika belum ada domain)

### 2. Jalankan Backend

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Backend sekarang berjalan di port **4000**.

---

## Langkah 3: Setup FRONTEND

### 1. Clone & Config

```bash
cd /var/www
git clone https://github.com/ikromnur/frontend-web-meesha.git
cd frontend-web-meesha

# Buat file .env local (jika belum ada contoh, buat baru)
nano .env
```

Isi dengan:

```env
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://api.domainanda.com
NEXTAUTH_SECRET=rahasia_super_aman_panjang_acak
NEXTAUTH_URL=https://domainanda.com
```

- **PENTING**: `NEXT_PUBLIC_BACKEND_URL` harus mengarah ke URL public Backend (bukan localhost, karena diakses browser user).

### 2. Jalankan Frontend

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Frontend sekarang berjalan di port **3000**.

---

## Langkah 4: Setup Nginx (Reverse Proxy)

Agar bisa diakses tanpa port (misal `domainanda.com` dan `api.domainanda.com`).

### 1. Buat Config Nginx

```bash
nano /etc/nginx/sites-available/meesha-fullstack
```

Isi dengan konfigurasi berikut (Ganti `domainanda.com` dengan domain asli Anda):

```nginx
# Konfigurasi FRONTEND (Port 3000) -> domainanda.com
server {
    server_name domainanda.com www.domainanda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Konfigurasi BACKEND (Port 4000) -> api.domainanda.com
server {
    server_name api.domainanda.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Aktifkan & Restart

```bash
# Hapus default
rm /etc/nginx/sites-enabled/default

# Link config baru
ln -s /etc/nginx/sites-available/meesha-fullstack /etc/nginx/sites-enabled/

# Test & Restart
nginx -t
systemctl restart nginx
```

### 3. Setup SSL (HTTPS)

```bash
certbot --nginx -d domainanda.com -d api.domainanda.com
```

---

## Tips Maintenance

### Update Aplikasi

Untuk mengupdate, masuk ke folder masing-masing (`/var/www/backend...` atau `/var/www/frontend...`), lalu:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
