# Environment Variables Example

Copy this to `.env` in the backend directory and fill in your values.

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dreamflow_studio

# JWT Configuration
JWT_SECRET=your-secret-key-minimum-32-characters-long-for-security
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters-long
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# CORS Configuration
CORS_ORIGIN=http://localhost:19006,http://localhost:3000
FRONTEND_URL=http://localhost:19006

# Email Configuration (Optional - for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@dreamflowstudio.com

# Error Monitoring (Optional - Sentry)
SENTRY_DSN=your-sentry-dsn-url

# Storage Configuration
STORAGE_PROVIDER=supabase
# For S3:
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
# For Supabase:
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_STORAGE_BUCKET=assets

# Logging
LOG_LEVEL=info

# Test Database (Optional)
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/test_db
```

