# Panduan Instalasi Manual - Clinic Backend

## Prasyarat Sistem

Pastikan sistem Anda telah terinstal:

- **Node.js** versi 18.x atau lebih tinggi (disarankan v20 atau v23)
- **npm** versi 9.x atau lebih tinggi
- **MongoDB** versi 6.x atau lebih tinggi
- **Redis** versi 6.x atau lebih tinggi
- **Qdrant** (Vector Database)

## Langkah-langkah Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd clinic-be
```

### 2. Install Dependencies

```bash
npm install
```

Proses ini akan menginstal semua dependencies yang diperlukan termasuk:

- NestJS framework
- MongoDB driver (Mongoose)
- Redis client (ioredis)
- BullMQ untuk queue management
- Qdrant client untuk vector database
- OpenAI SDK
- Dan dependencies lainnya

### 3. Setup MongoDB

#### Instalasi MongoDB (jika belum terinstal)

**Windows:**

1. Download MongoDB Community Server dari [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)
2. Jalankan installer dan ikuti wizard instalasi
3. MongoDB akan berjalan sebagai Windows Service secara otomatis

**Linux (Ubuntu/Debian):**

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**

```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0

# Start MongoDB
brew services start mongodb-community@6.0
```

#### Verifikasi MongoDB

```bash
# Cek status MongoDB
mongosh --eval "db.adminCommand('ping')"
```

### 4. Setup Redis

#### Instalasi Redis (jika belum terinstal)

**Windows:**

1. Download Redis untuk Windows dari [github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
2. Extract dan jalankan `redis-server.exe`
3. Atau gunakan WSL2 untuk menjalankan Redis versi Linux

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**

```bash
brew install redis

# Start Redis
brew services start redis
```

#### Verifikasi Redis

```bash
redis-cli ping
# Output: PONG
```

### 5. Setup Qdrant (Vector Database)

#### Instalasi Qdrant

**Menggunakan Docker (Recommended):**

```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

**Atau gunakan binary langsung:**

- Download dari [github.com/qdrant/qdrant/releases](https://github.com/qdrant/qdrant/releases)
- Extract dan jalankan executable

#### Verifikasi Qdrant

```bash
curl http://localhost:6333/
# Atau buka di browser: http://localhost:6333/dashboard
```

### 6. Konfigurasi Environment Variables

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan dengan konfigurasi sistem Anda:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/clinic

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=1h

# Redis Configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
```

**Penting:**

- Ganti `JWT_SECRET` dengan string random yang aman untuk production
- Masukkan `OPENAI_API_KEY` yang valid dari [platform.openai.com](https://platform.openai.com)
- Sesuaikan port Redis jika menggunakan port custom
- Untuk production, set `NODE_ENV=production`

### 7. Build Aplikasi

```bash
npm run build
```

Perintah ini akan:

- Compile TypeScript menjadi JavaScript
- Output akan disimpan di folder `dist/`

### 8. Jalankan Aplikasi

#### Mode Development (dengan hot-reload)

```bash
npm run start:dev
```

#### Mode Production

```bash
npm run start:prod
```

#### Mode Debug

```bash
npm run start:debug
```

### 9. Verifikasi Instalasi

Setelah aplikasi berjalan, verifikasi dengan:

1. **Cek API Health:**

   ```bash
   curl http://localhost:3000
   ```

2. **Akses Swagger Documentation:**
   Buka browser dan akses: `http://localhost:3000/api`

3. **Cek Logs:**
   Pastikan tidak ada error di console/terminal

## Troubleshooting

### Error: Cannot connect to MongoDB

- Pastikan MongoDB service berjalan
- Cek `MONGODB_URI` di file `.env`
- Verifikasi dengan: `mongosh mongodb://localhost:27017`

### Error: Cannot connect to Redis

- Pastikan Redis service berjalan
- Cek `REDIS_HOST` dan `REDIS_PORT` di file `.env`
- Verifikasi dengan: `redis-cli ping`

### Error: Cannot connect to Qdrant

- Pastikan Qdrant berjalan di port 6333
- Cek `QDRANT_URL` di file `.env`
- Verifikasi dengan: `curl http://localhost:6333/`

### Error: OpenAI API errors

- Pastikan `OPENAI_API_KEY` valid dan memiliki credit
- Cek quota API di OpenAI dashboard

### Error: Port already in use

- Ganti `PORT` di file `.env` ke port lain yang tersedia
- Atau stop aplikasi yang menggunakan port tersebut

### Error: npm install gagal

- Hapus folder `node_modules` dan file `package-lock.json`
- Jalankan `npm cache clean --force`
- Jalankan `npm install` lagi

## Menjalankan Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development Tools

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Struktur Database

Aplikasi akan otomatis membuat collections yang diperlukan di MongoDB saat pertama kali dijalankan.

## Catatan Keamanan

Untuk deployment production:

1. Gunakan `JWT_SECRET` yang kuat dan unik
2. Set `NODE_ENV=production`
3. Gunakan HTTPS untuk koneksi
4. Batasi akses ke database dengan firewall
5. Gunakan environment variables yang aman (jangan commit `.env`)
6. Update dependencies secara berkala

## Informasi Tambahan

- **Port Default:** 3000
- **Swagger UI:** http://localhost:3000/api
- **MongoDB Database:** clinic
- **Redis:** Digunakan untuk BullMQ job queue
- **Qdrant:** Digunakan untuk RAG (Retrieval-Augmented Generation)
