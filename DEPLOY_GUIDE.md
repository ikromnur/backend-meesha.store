# Panduan Deployment Backend Meesha Store ke VPS Hostinger dengan Docker

Panduan ini akan membantu Anda men-deploy aplikasi backend ke VPS Hostinger menggunakan Docker dan Docker Compose.

## Prasyarat
1.  **VPS Hostinger** dengan OS **Ubuntu 22.04** (atau 24.04).
2.  **Domain** (opsional, tapi disarankan untuk SSL).
3.  Akses **SSH** ke VPS.

---

## Langkah 1: Persiapan di VPS

Masuk ke VPS Anda menggunakan SSH (gunakan Terminal atau PuTTY):
```bash
ssh root@ip_vps_anda
```

### 1. Update System
```bash
apt update && apt upgrade -y
```

### 2. Install Docker & Docker Compose
Jalankan perintah berikut satu per satu:
```bash
# Install paket pendukung
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Tambahkan GPG Key Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Tambahkan Repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cek instalasi
docker --version
docker compose version
```

### 3. Install Git
```bash
apt install -y git
```

---

## Langkah 2: Setup Aplikasi

### 1. Clone Repository
```bash
cd /var/www
git clone https://github.com/ikromnur/backend-meesha.store.git
cd backend-meesha.store
```

### 2. Konfigurasi Environment Variable
Buat file `.env` dari contoh yang ada:
```bash
cp .env.example .env
nano .env
```
Isi semua variable dengan nilai yang sesuai untuk produksi.
**PENTING:**
- `NODE_ENV=production`
- `DATABASE_URL`: Pastikan URL koneksi database benar.
- `JWT_SECRET`: Gunakan secret yang kuat dan panjang.
- `APP_BASE_URL`: Gunakan domain atau IP VPS Anda.

Simpan dengan `Ctrl+O`, `Enter`, lalu keluar dengan `Ctrl+X`.

---

## Langkah 3: Menjalankan Aplikasi dengan Docker

Kita akan menggunakan file `docker-compose.prod.yml` yang sudah disiapkan untuk produksi.

### 1. Build dan Jalankan Container
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- `-f docker-compose.prod.yml`: Menggunakan file konfigurasi produksi.
- `-d`: Menjalankan di background (detached mode).
- `--build`: Memaksa build ulang image.

### 2. Cek Status Container
```bash
docker compose -f docker-compose.prod.yml ps
```
Anda harusnya melihat status `Up` pada service `backend`.

### 3. Cek Logs (Jika ada masalah)
```bash
docker compose -f docker-compose.prod.yml logs -f
```

Saat ini, backend Anda berjalan di port `4000` (http://ip_vps_anda:4000).

---

## Langkah 4: Setup Domain & SSL dengan Nginx (Reverse Proxy)

Agar aplikasi bisa diakses via domain (https://api.domainanda.com) dan lebih aman.

### 1. Install Nginx & Certbot
```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 2. Konfigurasi Nginx
Buat file konfigurasi baru:
```bash
nano /etc/nginx/sites-available/meesha-backend
```
Isi dengan konfigurasi berikut (ganti `api.domainanda.com` dengan domain Anda):

```nginx
server {
    server_name api.domainanda.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Aktifkan konfigurasi:
```bash
ln -s /etc/nginx/sites-available/meesha-backend /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Hapus default jika tidak dipakai
nginx -t # Test konfigurasi
systemctl restart nginx
```

### 3. Setup SSL (HTTPS)
```bash
certbot --nginx -d api.domainanda.com
```
Ikuti instruksi di layar. Certbot akan otomatis mengonfigurasi SSL.

---

## Langkah 5: Update Aplikasi (Maintenance)

Jika Anda melakukan perubahan kode dan push ke GitHub, lakukan ini di VPS untuk update:

```bash
cd /var/www/backend-meesha.store
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting Umum

1.  **Error Database**: Cek `DATABASE_URL` di `.env`. Pastikan database server mengizinkan koneksi dari IP VPS.
2.  **Port Conflict**: Pastikan port 4000 tidak dipakai aplikasi lain.
3.  **Permission Error**: Jika ada error permission saat upload file, pastikan folder upload (jika ada) di-mount dengan permission yang benar.

Selamat! Backend Anda sudah live.
