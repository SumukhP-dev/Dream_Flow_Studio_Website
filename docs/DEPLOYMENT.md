# Deployment Guide

This guide covers deploying Dream Flow Creator Studio to production environments.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (or use Docker Compose)
- Redis instance (or use Docker Compose)
- Environment variables configured
- Domain name and SSL certificate (for production)

## Quick Start with Docker Compose

### 1. Clone Repository

```bash
git clone <repository-url>
cd Dream_Flow_Studio_Website
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp backend/ENV_EXAMPLE.md .env
# Edit .env with your production values
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Random secret (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Random secret (minimum 32 characters)
- `OPENAI_API_KEY` - OpenAI API key
- `CORS_ORIGIN` - Your frontend URL(s)
- `REDIS_PASSWORD` - Redis password (optional but recommended)

### 3. Run Database Migrations

```bash
cd backend
npm install
npm run db:migrate
```

### 4. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

- Backend API: http://localhost:3000/health
- Frontend: http://localhost
- API Docs: http://localhost:3000/api-docs

## Deployment to Cloud Platforms

### AWS (EC2 + RDS + ElastiCache)

1. **Set up RDS PostgreSQL instance**
2. **Set up ElastiCache Redis instance**
3. **Launch EC2 instance** (t2.medium or larger)
4. **Install Docker on EC2**
5. **Configure security groups** (ports 80, 443, 3000)
6. **Set up Application Load Balancer** (optional)
7. **Configure environment variables** on EC2
8. **Deploy using Docker Compose**

### Railway

1. **Create Railway project**
2. **Add PostgreSQL service**
3. **Add Redis service**
4. **Deploy backend** (connect to Railway PostgreSQL/Redis)
5. **Deploy frontend** (set `EXPO_PUBLIC_API_BASE_URL`)
6. **Configure environment variables** in Railway dashboard

### Vercel (Frontend) + Railway/Render (Backend)

**Backend:**
1. Deploy backend to Railway or Render
2. Configure environment variables
3. Run database migrations

**Frontend:**
1. Connect frontend repository to Vercel
2. Set environment variable: `EXPO_PUBLIC_API_BASE_URL`
3. Deploy

### Render

1. **Create PostgreSQL database** on Render
2. **Create Redis instance** on Render
3. **Create Web Service** for backend
   - Build command: `cd backend && npm install && npm run build`
   - Start command: `cd backend && npm start`
4. **Create Static Site** for frontend
   - Build command: `cd frontend && npm install && npm run build:web`
   - Publish directory: `frontend/dist`

## Database Migrations

### Running Migrations

```bash
cd backend
npm run db:migrate
```

### Production Migration Strategy

1. **Backup database** before migrations
2. **Test migrations** on staging first
3. **Run migrations** during maintenance window
4. **Verify** migration success
5. **Monitor** for issues

## Environment Variables

See `backend/ENV_EXAMPLE.md` for complete list.

### Critical Production Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
CORS_ORIGIN=https://yourdomain.com
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
```

## SSL/HTTPS Setup

### Using Nginx Reverse Proxy

1. Install Nginx
2. Configure SSL with Let's Encrypt
3. Set up reverse proxy to backend (port 3000)
4. Serve frontend static files

Example Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/dreamflow-frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Health Checks

- Backend: `GET /health`
- Frontend: `GET /health` (if configured)

### Logging

- Backend logs: Check Docker logs or Winston log files
- Frontend logs: Browser console or error tracking service

### Error Monitoring

Configure Sentry DSN in environment variables for production error tracking.

## Backup Strategy

See `docs/DATABASE_BACKUP.md` for detailed backup procedures.

## Scaling

### Horizontal Scaling

1. **Backend**: Run multiple instances behind load balancer
2. **Database**: Use read replicas for read-heavy operations
3. **Redis**: Use Redis Cluster for high availability

### Vertical Scaling

- Increase instance size (CPU, RAM)
- Optimize database queries
- Add caching layers

## Troubleshooting

### Backend won't start

- Check database connection
- Verify environment variables
- Check logs: `docker logs dreamflow-backend`

### Database connection errors

- Verify `DATABASE_URL` format
- Check database is accessible
- Verify network connectivity

### Redis connection errors

- Verify Redis is running
- Check `REDIS_HOST` and `REDIS_PASSWORD`
- Media generation will be disabled if Redis unavailable

## Rollback Procedure

1. **Stop services**: `docker-compose down`
2. **Restore database backup** (if needed)
3. **Revert code**: `git checkout <previous-commit>`
4. **Rebuild**: `docker-compose build`
5. **Start**: `docker-compose up -d`

## Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable error monitoring (Sentry)
- [ ] Regular security updates
- [ ] Use non-root Docker user

