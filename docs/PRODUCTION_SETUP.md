# Production Setup Guide

Step-by-step guide for setting up Dream Flow Creator Studio in production.

## Pre-Deployment Checklist

- [ ] Database created and accessible
- [ ] Redis instance available
- [ ] Environment variables configured
- [ ] API keys obtained (OpenAI, RunwayML, ElevenLabs, etc.)
- [ ] Storage configured (S3 or Supabase)
- [ ] Domain name and SSL certificate ready
- [ ] Monitoring and logging configured

## Step 1: Database Setup

### Option A: Managed Database (Recommended)

**AWS RDS:**
1. Create PostgreSQL 15 instance
2. Configure security groups
3. Note connection string

**Supabase:**
1. Create new project
2. Get connection string from Settings > Database

### Option B: Self-Hosted

```bash
# Using Docker
docker run -d \
  --name postgres \
  -e POSTGRES_DB=dreamflow_studio \
  -e POSTGRES_USER=dreamflow \
  -e POSTGRES_PASSWORD=<strong-password> \
  -p 5432:5432 \
  postgres:15-alpine
```

## Step 2: Redis Setup

### Option A: Managed Redis (Recommended)

**AWS ElastiCache:**
1. Create Redis cluster
2. Configure security groups
3. Note endpoint and password

**Upstash:**
1. Create Redis database
2. Get connection URL

### Option B: Self-Hosted

```bash
# Using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass <strong-password>
```

## Step 3: Storage Setup

### Option A: Supabase Storage

1. Create Supabase project
2. Create storage bucket named `assets`
3. Configure bucket policies (public read, authenticated write)
4. Get service key from Settings > API

### Option B: AWS S3

1. Create S3 bucket
2. Configure bucket policies
3. Create IAM user with S3 access
4. Generate access keys

## Step 4: Environment Configuration

Create `.env` file with all required variables:

```bash
# Copy template
cp backend/ENV_EXAMPLE.md .env

# Edit with production values
nano .env
```

### Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

## Step 5: Database Migration

```bash
cd backend

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Verify
npm run db:studio  # Optional: open Prisma Studio
```

## Step 6: Build and Deploy

### Using Docker Compose

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Manual Deployment

**Backend:**
```bash
cd backend
npm install
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run build:web
# Serve dist/ directory with nginx or similar
```

## Step 7: Verify Deployment

1. **Health Check**: `curl http://localhost:3000/health`
2. **API Docs**: Visit `http://localhost:3000/api-docs`
3. **Frontend**: Visit `http://localhost`
4. **Test Authentication**: Try signup/login
5. **Test Story Generation**: Create a test story

## Step 8: Configure Reverse Proxy (Nginx)

See `docs/DEPLOYMENT.md` for Nginx configuration.

## Step 9: Set Up Monitoring

### Sentry (Error Tracking)

1. Create Sentry project
2. Get DSN
3. Add to `.env`: `SENTRY_DSN=your-dsn`

### Health Checks

Set up monitoring to check:
- `GET /health` endpoint
- Database connectivity
- Redis connectivity

## Step 10: Configure Backups

See `docs/DATABASE_BACKUP.md` for backup procedures.

## Post-Deployment

### Initial User Setup

1. Create admin user (if needed)
2. Test all features
3. Monitor error logs
4. Check performance metrics

### Maintenance

- **Daily**: Check error logs
- **Weekly**: Review analytics
- **Monthly**: Database backups verification
- **Quarterly**: Security updates

## Troubleshooting

### Common Issues

**Backend won't connect to database:**
- Verify `DATABASE_URL` format
- Check network connectivity
- Verify database is accessible

**Media generation not working:**
- Check Redis connection
- Verify API keys (RunwayML, ElevenLabs)
- Check provider configuration

**Frontend can't reach backend:**
- Verify `EXPO_PUBLIC_API_BASE_URL`
- Check CORS configuration
- Verify backend is running

## Performance Tuning

### Database

- Add indexes for frequently queried fields
- Enable connection pooling
- Monitor slow queries

### Redis

- Configure appropriate memory limits
- Set up persistence if needed
- Monitor memory usage

### Application

- Enable compression
- Configure caching
- Optimize queries
- Use CDN for static assets

## Security Hardening

1. **Change default passwords**
2. **Enable firewall** (only allow necessary ports)
3. **Use HTTPS** everywhere
4. **Regular updates** (OS, dependencies)
5. **Monitor logs** for suspicious activity
6. **Rate limiting** (already configured)
7. **Input validation** (already implemented)

## Scaling Considerations

### When to Scale

- High CPU usage (>70%)
- High memory usage (>80%)
- Slow response times (>2s)
- Database connection pool exhaustion

### Scaling Options

1. **Vertical**: Increase instance size
2. **Horizontal**: Add more instances
3. **Database**: Use read replicas
4. **Caching**: Add Redis caching layer

