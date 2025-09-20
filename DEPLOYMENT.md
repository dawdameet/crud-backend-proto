# Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Node.js 16+ installed on server
- Supabase project configured
- SSL certificate for HTTPS
- Reverse proxy (nginx recommended)

### Environment Setup

1. **Create production environment file:**
```bash
cp .env.example .env
```

2. **Configure production variables:**
```env
NODE_ENV=production
PORT=3000

# Supabase (Production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# JWT Secrets (Generate strong 64+ character secrets)
JWT_SECRET=your_super_long_production_jwt_secret_here_64_chars_minimum
JWT_REFRESH_SECRET=your_super_long_production_refresh_secret_here_64_chars_minimum

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Database Setup

1. **Run the schema in Supabase SQL Editor:**
```sql
-- Copy and paste the contents of database/schema.sql
```

2. **Verify tables are created:**
- users
- refresh_tokens
- auth_logs

### Server Deployment

#### Option 1: PM2 (Recommended)

1. **Install PM2:**
```bash
npm install -g pm2
```

2. **Create ecosystem file:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'auth-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

3. **Deploy:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Option 2: Docker

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

2. **Build and run:**
```bash
docker build -t auth-backend .
docker run -d -p 3000:3000 --env-file .env auth-backend
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Strong JWT secrets (64+ characters)
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting configured
- [ ] CORS origins restricted to your domains
- [ ] Server firewall configured
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented

### Monitoring

1. **Application logs:**
```bash
pm2 logs auth-backend
```

2. **System monitoring:**
```bash
pm2 monit
```

3. **Log rotation:**
```bash
pm2 install pm2-logrotate
```

### Backup Strategy

1. **Database backups (Supabase handles this automatically)**
2. **Application logs backup**
3. **Environment configuration backup**

### Health Checks

Set up monitoring for:
- `/health` endpoint
- Database connectivity
- JWT token validation
- Rate limiting functionality

### Scaling Considerations

1. **Horizontal scaling:** Use load balancer with multiple instances
2. **Database scaling:** Supabase handles this automatically
3. **Caching:** Consider Redis for session storage
4. **CDN:** For static assets if any

### Troubleshooting

Common issues and solutions:

1. **JWT errors:** Check secret configuration
2. **Database connection:** Verify Supabase credentials
3. **Rate limiting:** Check IP forwarding configuration
4. **CORS errors:** Verify origin configuration
