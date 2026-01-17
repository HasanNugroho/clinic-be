# Panduan Instalasi dengan Docker - Clinic Backend

## Prasyarat Sistem

Pastikan sistem Anda telah terinstal:

- **Docker** versi 20.x atau lebih tinggi
- **Docker Compose** versi 2.x atau lebih tinggi

## Instalasi Docker

### Windows

1. Download **Docker Desktop for Windows** dari [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Jalankan installer dan ikuti wizard instalasi
3. Restart komputer jika diminta
4. Jalankan Docker Desktop
5. Verifikasi instalasi:
   ```powershell
   docker --version
   docker compose version
   ```

### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (agar tidak perlu sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version
docker compose version
```

### macOS

```bash
# Install via Homebrew
brew install --cask docker

# Atau download Docker Desktop dari website
# https://www.docker.com/products/docker-desktop/

# Verifikasi
docker --version
docker compose version
```

## Metode Instalasi

Ada 2 metode instalasi dengan Docker:

1. **Metode 1:** Menggunakan Docker Compose dengan semua services (Recommended)
2. **Metode 2:** Build dan run manual dengan Docker

---

## Metode 1: Docker Compose (Recommended)

Metode ini akan menjalankan semua services yang diperlukan dalam satu perintah.

### 1. Clone Repository

```bash
git clone <repository-url>
cd clinic-be
```

### 2. Setup Environment Variables

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan konfigurasi:

```env
# Database Configuration
MONGODB_URI=mongodb://mongodb:27017/clinic

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=1h

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
PORT=3000
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
```

**Catatan Penting:**

- Gunakan hostname service (mongodb, redis, qdrant) bukan localhost
- Ganti `JWT_SECRET` dengan string random yang aman
- Masukkan `OPENAI_API_KEY` yang valid

### 3. Buat Docker Network

```bash
docker network create shared-net
```

Network ini digunakan untuk komunikasi antar container.

### 4. Jalankan Qdrant

```bash
docker compose -f docker-compose.qdrant.yml up -d
```

Perintah ini akan:

- Download image Qdrant
- Membuat container Qdrant
- Expose port 6333 dan 6334
- Membuat volume untuk persistent storage di `./qdrant_storage`

### 5. Setup Services Tambahan (MongoDB & Redis)

Buat file `docker-compose.full.yml` untuk semua services:

```yaml
services:
  mongodb:
    image: mongo:6
    container_name: clinic-mongodb
    restart: unless-stopped
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    networks:
      - shared-net
    environment:
      - MONGO_INITDB_DATABASE=clinic

  redis:
    image: redis:7-alpine
    container_name: clinic-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    networks:
      - shared-net
    command: redis-server --appendonly yes

  qdrant:
    image: qdrant/qdrant
    container_name: clinic-qdrant
    restart: unless-stopped
    ports:
      - '6333:6333'
      - '6334:6334'
    volumes:
      - ./qdrant_storage:/qdrant/storage:z
    networks:
      - shared-net

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: clinic-be
    restart: unless-stopped
    ports:
      - '3000:3000'
    env_file:
      - .env
    networks:
      - shared-net
    depends_on:
      - mongodb
      - redis
      - qdrant

networks:
  shared-net:
    driver: bridge

volumes:
  mongodb_data:
  redis_data:
```

### 6. Build dan Jalankan Semua Services

```bash
# Build image aplikasi
docker compose -f docker-compose.full.yml build

# Jalankan semua services
docker compose -f docker-compose.full.yml up -d
```

### 7. Verifikasi Instalasi

```bash
# Cek status containers
docker compose -f docker-compose.full.yml ps

# Cek logs aplikasi
docker compose -f docker-compose.full.yml logs -f app

# Test API
curl http://localhost:3000

# Akses Swagger UI
# Buka browser: http://localhost:3000/api

# Akses Qdrant Dashboard
# Buka browser: http://localhost:6333/dashboard
```

### 8. Mengelola Services

```bash
# Stop semua services
docker compose -f docker-compose.full.yml down

# Stop dan hapus volumes (HATI-HATI: akan menghapus data)
docker compose -f docker-compose.full.yml down -v

# Restart service tertentu
docker compose -f docker-compose.full.yml restart app

# View logs
docker compose -f docker-compose.full.yml logs -f

# Rebuild setelah code changes
docker compose -f docker-compose.full.yml up -d --build
```

---

## Metode 2: Docker Manual (Tanpa Compose)

### 1. Buat Docker Network

```bash
docker network create shared-net
```

### 2. Jalankan MongoDB

```bash
docker run -d \
  --name clinic-mongodb \
  --network shared-net \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_DATABASE=clinic \
  mongo:6
```

### 3. Jalankan Redis

```bash
docker run -d \
  --name clinic-redis \
  --network shared-net \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### 4. Jalankan Qdrant

```bash
docker run -d \
  --name clinic-qdrant \
  --network shared-net \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

### 5. Build Image Aplikasi

```bash
docker build -t clinic-be:latest .
```

### 6. Jalankan Aplikasi

```bash
docker run -d \
  --name clinic-be \
  --network shared-net \
  -p 3000:3000 \
  --env-file .env \
  clinic-be:latest
```

### 7. Verifikasi

```bash
# Cek running containers
docker ps

# Cek logs
docker logs -f clinic-be

# Test API
curl http://localhost:3000
```

---

## Menggunakan Image dari Docker Hub

Jika image sudah dipublish ke Docker Hub (seperti `devnug/clinic-be:latest`):

### 1. Pull Image

```bash
docker pull devnug/clinic-be:latest
```

### 2. Jalankan dengan Docker Compose

Gunakan file `docker-compose.yml` yang sudah ada:

```bash
# Pastikan network sudah dibuat
docker network create shared-net

# Jalankan Qdrant
docker compose -f docker-compose.qdrant.yml up -d

# Jalankan aplikasi
docker compose up -d
```

---

## Troubleshooting

### Container tidak bisa connect ke service lain

**Solusi:**

- Pastikan semua container dalam network yang sama (`shared-net`)
- Gunakan hostname service (mongodb, redis, qdrant) bukan localhost
- Cek dengan: `docker network inspect shared-net`

### Port already in use

**Solusi:**

```bash
# Cek process yang menggunakan port
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Stop container yang menggunakan port
docker stop <container-name>

# Atau ubah port mapping
docker run -p 3001:3000 ...
```

### Container restart terus-menerus

**Solusi:**

```bash
# Cek logs untuk error
docker logs clinic-be

# Cek environment variables
docker exec clinic-be env

# Pastikan semua dependencies (mongodb, redis, qdrant) running
docker ps
```

### Build gagal

**Solusi:**

```bash
# Clear Docker cache
docker builder prune -a

# Build ulang tanpa cache
docker build --no-cache -t clinic-be:latest .
```

### Volume permission issues (Linux)

**Solusi:**

```bash
# Fix ownership
sudo chown -R $USER:$USER ./qdrant_storage

# Atau jalankan dengan user ID
docker run --user $(id -u):$(id -g) ...
```

### Out of disk space

**Solusi:**

```bash
# Hapus unused images
docker image prune -a

# Hapus unused volumes
docker volume prune

# Hapus semua unused resources
docker system prune -a --volumes
```

---

## Perintah Berguna

### Monitoring

```bash
# Cek resource usage
docker stats

# Cek logs real-time
docker logs -f clinic-be

# Masuk ke container
docker exec -it clinic-be sh

# Inspect container
docker inspect clinic-be
```

### Backup & Restore

```bash
# Backup MongoDB
docker exec clinic-mongodb mongodump --out /backup
docker cp clinic-mongodb:/backup ./mongodb-backup

# Restore MongoDB
docker cp ./mongodb-backup clinic-mongodb:/backup
docker exec clinic-mongodb mongorestore /backup

# Backup Qdrant
tar -czf qdrant-backup.tar.gz ./qdrant_storage
```

### Update Image

```bash
# Pull latest image
docker pull devnug/clinic-be:latest

# Stop dan remove old container
docker compose down

# Start dengan image baru
docker compose up -d
```

---

## Production Deployment

Untuk production deployment, pertimbangkan:

1. **Environment Variables:**
   - Gunakan secrets management (Docker Secrets, Kubernetes Secrets)
   - Jangan commit `.env` ke repository

2. **Resource Limits:**

   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             cpus: '1'
             memory: 1G
   ```

3. **Health Checks:**

   ```yaml
   services:
     app:
       healthcheck:
         test: ['CMD', 'curl', '-f', 'http://localhost:3000']
         interval: 30s
         timeout: 10s
         retries: 3
   ```

4. **Logging:**

   ```yaml
   services:
     app:
       logging:
         driver: 'json-file'
         options:
           max-size: '10m'
           max-file: '3'
   ```

5. **Security:**
   - Gunakan non-root user di Dockerfile
   - Scan image untuk vulnerabilities: `docker scan clinic-be:latest`
   - Update base images secara berkala

6. **Orchestration:**
   - Pertimbangkan menggunakan Kubernetes atau Docker Swarm untuk production
   - Setup load balancing dan auto-scaling

---

## Informasi Tambahan

- **Dockerfile:** Multi-stage build untuk optimasi ukuran image
- **Base Image:** node:23-alpine (lightweight)
- **Port Mapping:** 3000 (app), 27017 (mongodb), 6379 (redis), 6333/6334 (qdrant)
- **Volumes:** Persistent storage untuk database dan vector store
- **Network:** Bridge network untuk komunikasi antar container
