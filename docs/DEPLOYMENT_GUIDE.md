# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set:

```bash
# Required
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=20&connect_timeout=10&statement_timeout=10000"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
NODE_ENV="production"

# Optional but recommended
APP_URL="https://yourdomain.com"
JWT_EXPIRES_IN="7d"
```

### 2. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data (only first time)
npm run db:seed
```

### 3. Security Configuration
- [ ] Change default admin credentials
- [ ] Use strong JWT_SECRET (32+ characters, random)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS if needed
- [ ] Set up firewall rules
- [ ] Enable database SSL connections

### 4. Performance Optimization
- [ ] Configure database connection pooling
- [ ] Set up CDN for static assets
- [ ] Enable Next.js image optimization
- [ ] Configure caching headers
- [ ] Set up Redis for rate limiting (if scaling)

### 5. Monitoring Setup
- [ ] Configure error tracking (Sentry, LogRocket, etc.)
- [ ] Set up application monitoring (New Relic, Datadog, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts for critical errors

## Deployment Steps

### Option 1: Vercel (Recommended for Next.js)

1. **Connect Repository**
   ```bash
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   
   # Build application
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t dashboard-app .
   docker run -p 3000:3000 --env-file .env.production dashboard-app
   ```

### Option 3: Traditional Server (Node.js)

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Use PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "dashboard" -- start
   pm2 save
   pm2 startup
   ```

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "dashboard-api",
  "database": "connected"
}
```

### 2. Test Critical Flows
- [ ] User login
- [ ] User creation
- [ ] Role assignment
- [ ] Permission management
- [ ] Audit log viewing

### 3. Monitor
- [ ] Check error logs
- [ ] Monitor response times
- [ ] Check database connection pool
- [ ] Verify rate limiting is working
- [ ] Check security headers

## Scaling Considerations

### For < 1,000 users
- Current setup is sufficient
- Single database instance
- In-memory rate limiting

### For 1,000 - 10,000 users
- Consider Redis for rate limiting
- Database read replicas
- CDN for static assets
- Load balancer

### For 10,000+ users
- Redis cluster for rate limiting and caching
- Database sharding
- Multiple application instances
- Message queue for async operations
- Separate read/write databases

## Maintenance

### Regular Tasks
- [ ] Monitor error rates daily
- [ ] Review audit logs weekly
- [ ] Check database performance monthly
- [ ] Update dependencies quarterly
- [ ] Security audit annually

### Backup Strategy
- [ ] Daily database backups
- [ ] Weekly full backups
- [ ] Test restore procedures monthly
- [ ] Store backups off-site

### Updates
- [ ] Test updates in staging first
- [ ] Use feature flags for gradual rollouts
- [ ] Monitor after each deployment
- [ ] Have rollback plan ready

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Check DATABASE_URL
- Verify network connectivity
- Check connection pool limits
- Review database logs

**High Memory Usage**
- Check for memory leaks
- Review Prisma query patterns
- Consider connection pooling limits
- Monitor Node.js heap size

**Slow Queries**
- Enable query logging
- Review database indexes
- Optimize N+1 queries
- Consider database read replicas

**Rate Limiting Issues**
- Check rate limit configuration
- Verify IP detection
- Consider Redis for multi-instance

## Support

For issues or questions:
1. Check application logs
2. Review audit logs
3. Check monitoring dashboards
4. Contact system administrator

