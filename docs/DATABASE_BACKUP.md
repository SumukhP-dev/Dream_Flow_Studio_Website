# Database Backup Strategy

This document outlines the database backup strategy for Dream Flow Studio.

## Backup Methods

### 1. Automated Backups (Recommended)

#### Using pg_dump (PostgreSQL)

Create a backup script that runs daily:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/dreamflow"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="dreamflow_studio"
DB_USER="your_user"
DB_HOST="localhost"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/backup_$DATE.dump

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.dump

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.dump.gz"
```

#### Using Cron

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * /path/to/backup.sh >> /var/log/db-backup.log 2>&1
```

### 2. Cloud Provider Backups

#### AWS RDS
- Enable automated backups in RDS console
- Set backup retention period (recommended: 7-30 days)
- Enable point-in-time recovery for production

#### Heroku Postgres
- Automatic daily backups included
- Manual backups: `heroku pg:backups:capture`
- Download: `heroku pg:backups:download`

#### Supabase
- Automatic daily backups
- Manual backups available in dashboard
- Point-in-time recovery available

### 3. Prisma Migrations Backup

Always backup migration files:

```bash
# Backup migrations directory
tar -czf migrations_backup_$(date +%Y%m%d).tar.gz backend/prisma/migrations/
```

## Restore Procedures

### From pg_dump backup:

```bash
# Restore from compressed backup
gunzip backup_20240101_020000.dump.gz
pg_restore -h localhost -U your_user -d dreamflow_studio -c backup_20240101_020000.dump
```

### From SQL dump:

```bash
psql -h localhost -U your_user -d dreamflow_studio < backup.sql
```

## Backup Schedule Recommendations

### Production
- **Full Backup**: Daily at 2 AM
- **Retention**: 30 days
- **Off-site Storage**: Weekly backups to S3/cloud storage
- **Point-in-time Recovery**: Enable if available

### Development/Staging
- **Full Backup**: Weekly
- **Retention**: 7 days
- **Before Deployments**: Manual backup before major changes

## Verification

Test restore procedures regularly:

1. Create test database
2. Restore from backup
3. Verify data integrity
4. Document any issues

## Monitoring

Set up alerts for:
- Backup failures
- Backup size anomalies
- Disk space for backup storage

## Best Practices

1. **3-2-1 Rule**: 
   - 3 copies of data
   - 2 different media types
   - 1 off-site backup

2. **Encryption**: Encrypt backups at rest

3. **Testing**: Regularly test restore procedures

4. **Documentation**: Keep restore procedures documented and accessible

5. **Automation**: Automate backups to prevent human error

## Emergency Contacts

- Database Administrator: [Contact Info]
- Cloud Provider Support: [Contact Info]
- Backup Storage Location: [Location]

## Backup Script Example (Node.js)

```javascript
// scripts/backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse database URL
const url = new URL(DB_URL);
const dbName = url.pathname.slice(1);
const dbUser = url.username;
const dbHost = url.hostname;
const dbPort = url.port || 5432;

const date = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup-${date}.dump`);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f ${backupFile}`;

exec(command, { env: { ...process.env, PGPASSWORD: url.password } }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`Backup completed: ${backupFile}`);
});
```

Run with: `node scripts/backup.js`

