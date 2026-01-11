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

# Setup Firewall (PENTING)
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
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
git clone https://github.com/ikromnur/frontend-meesha.store.git
cd frontend-meesha.store

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

### 3. Masalah Koneksi (ERR_CONNECTION_TIMED_OUT)

Jika website masih tidak bisa dibuka, cek dua hal ini:

#### A. Firewall Hostinger (External) - PALING KRUSIAL

VPS Hostinger memiliki firewall tambahan di luar VPS (di panel dashboard website Hostinger).

1.  Login ke Dashboard Hostinger.
2.  Masuk ke menu **VPS** -> **Kelola VPS Anda**.
3.  Cari menu **Keamanan** -> **Firewall**.
4.  Jika ada tombol **"Reset to Default"**, klik itu.
5.  Jika tidak, pastikan Anda menambahkan aturan (Rule) untuk membuka port:
    - **HTTP**: Port 80
    - **HTTPS**: Port 443
    - **SSH**: Port 22

Tanpa ini, website tidak akan bisa diakses dari luar meskipun settingan di dalam VPS sudah benar.

#### B. Masalah IPv6 (DNS AAAA Record)

Jika Firewall sudah oke tapi masih error, mungkin karena browser mencoba akses via IPv6.

1.  Cek DNS Management domain Anda.
2.  Hapus record tipe **AAAA**.
3.  Pastikan Nginx sudah support IPv6 (listen [::]:80 dan [::]:443) seperti di config langkah 5.

```bash
docker compose up -d --build
```

Frontend sekarang berjalan di port **3000**.

---

## Langkah 4: Setup Domain & Nginx (Reverse Proxy)

### 1. Setting DNS (Di Panel Domain Hostinger)

Masuk ke menu **DNS Zone Editor** di Hostinger, lalu tambahkan/edit record berikut:

| Type  | Name | Content / Points to | TTL   |
| ----- | ---- | ------------------- | ----- |
| A     | @    | 76.13.16.97         | 14400 |
| A     | api  | 76.13.16.97         | 14400 |
| CNAME | www  | meesha.store        | 14400 |

_Tunggu beberapa menit (atau jam) agar DNS menyebar (propagasi)._

### 2. Buat Config Nginx

Login ke VPS, lalu buat file config:

```bash
nano /etc/nginx/sites-available/meesha-store
```

Isi dengan konfigurasi berikut (sudah disesuaikan untuk `meesha.store`):

```nginx
# Konfigurasi FRONTEND (Port 3000) -> meesha.store
server {
    server_name meesha.store www.meesha.store;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Konfigurasi BACKEND (Port 4000) -> api.meesha.store
server {
    server_name api.meesha.store;

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

### 3. Aktifkan & Restart Nginx

```bash
# Hapus default config (jika ada)
rm /etc/nginx/sites-enabled/default

# Link config baru
ln -s /etc/nginx/sites-available/meesha-store /etc/nginx/sites-enabled/

# Cek error & Restart
nginx -t
systemctl restart nginx
```

### 4. Setup SSL (HTTPS) Otomatis

Jalankan perintah ini untuk mendapatkan sertifikat SSL gratis dari Let's Encrypt:

```bash
certbot --nginx -d meesha.store -d www.meesha.store -d api.meesha.store
```

_Ikuti instruksi di layar (masukkan email, setujui terms)._

---

## Langkah 5: Update Environment Variable (PENTING)

Setelah domain dan SSL aktif (https), Anda **WAJIB** mengupdate file `.env` di kedua aplikasi agar menggunakan domain, bukan IP lagi.

### 1. Update Backend

```bash
cd /var/www/backend-meesha.store
nano .env
```

Ubah:

```env
APP_BASE_URL=https://api.meesha.store
```

Lalu restart: `docker compose up -d --build`

### 2. Update Frontend

```bash
cd /var/www/frontend-meesha.store
nano .env
```

Ubah:

```env
NEXT_PUBLIC_BACKEND_URL=https://api.meesha.store
NEXTAUTH_URL=https://meesha.store
```

Lalu restart: `docker compose up -d --build`

---

## Tips Maintenance

### Update Aplikasi

Untuk mengupdate, masuk ke folder masing-masing (`/var/www/backend...` atau `/var/www/frontend...`), lalu:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
