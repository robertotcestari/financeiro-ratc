---
name: Production SSH Access
description: Provides guidance and utilities for securely accessing the Financeiro RATC production server via SSH. Use this when you need to connect to the production server, run commands, check logs, manage services, troubleshoot issues, or work with the Next.js application.
---

# Production SSH Access Skill

## Overview

This skill guides you through accessing and working with the Financeiro RATC production server.

## Server Information

- **Host**: 64.176.5.254
- **User**: robertotcestari
- **OS**: Linux (Ubuntu/Debian)
- **Web Server**: nginx (likely) or similar
- **Application Server**: Node.js (Next.js 16)
- **Process Manager**: PM2 (likely) or systemd service
- **Database**: MySQL 8.0 - database name = `financeiro_ratc`
- **Application Root**: `/opt/financeiro-ratc/current` (symlink to active release)
- **Deployment Structure**: Capistrano-style with `current`, `releases/`, and `shared/` directories

## Quick Access

### Connect to Production Server

```bash
ssh robertotcestari@64.176.5.254
```

### Common SSH Commands

**Check application status:**
```bash
# If using PM2
ssh robertotcestari@64.176.5.254 "pm2 list"

# If using systemd
ssh robertotcestari@64.176.5.254 "systemctl status financeiro-ratc"
```

**Check nginx configuration:**
```bash
ssh robertotcestari@64.176.5.254 "sudo nginx -t"
```

**Check service status:**
```bash
ssh robertotcestari@64.176.5.254 "systemctl status nginx"
ssh robertotcestari@64.176.5.254 "systemctl status mysql"
```

**Check MySQL status:**
```bash
ssh robertotcestari@64.176.5.254 "sudo systemctl status mysql"
```

## File Transfer

WARNING: do not transfer files - this is used only for emergency debugging. To change files in the production server, use the deployment pipeline.

### Copy files from production to local:
```bash
scp robertotcestari@64.176.5.254:/path/on/server /local/path
```

### Copy files from local to production:
```bash
scp /local/path robertotcestari@64.176.5.254:/path/on/server
```

## Production Application Paths

- **Application Current**: `/opt/financeiro-ratc/current`
- **Releases**: `/opt/financeiro-ratc/releases/` (timestamped directories)
- **Shared Files**: `/opt/financeiro-ratc/shared/` (persistent data between releases)
- **Uploads**: `/opt/financeiro-ratc/uploads/` (user uploaded files)
- **.env Config**: `/opt/financeiro-ratc/shared/.env`

## Database Access

### MySQL Connection Information

**Production Database:**
- **User**: `robertotcestari` (local access)
- **Password**: Check `/opt/financeiro-ratc/shared/.env`
- **Database**: `financeiro_ratc`
- **Host**: `localhost` (application runs on same server)

**Remote Database Access User (for external connections):**
- **User**: `ratcfinanceiro`
- **Password**: `TestPass123@`
- **Database**: `financeiro_ratc`
- **Host**: `64.176.5.254`
- **Port**: `3306` (firewall rule configured)

### Connect to MySQL on Server

```bash
# As root with sudo
ssh robertotcestari@64.176.5.254 "sudo mysql -u root financeiro_ratc"

# As robertotcestari user (check .env for password)
ssh robertotcestari@64.176.5.254 "mysql -u robertotcestari -p financeiro_ratc"
```

### Common Database Commands

**List tables:**
```bash
ssh robertotcestari@64.176.5.254 "sudo mysql -u root -e 'USE financeiro_ratc; SHOW TABLES;'"
```

**Check database size:**
```bash
ssh robertotcestari@64.176.5.254 "sudo mysql -u root -e 'SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS \"Size (MB)\" FROM information_schema.tables WHERE table_schema = \"financeiro_ratc\" GROUP BY table_schema;'"
```

**Count records in main tables:**
```bash
ssh robertotcestari@64.176.5.254 "sudo mysql -u root financeiro_ratc -e 'SELECT COUNT(*) AS transactions FROM transactions; SELECT COUNT(*) AS processed FROM processed_transactions; SELECT COUNT(*) AS categories FROM categories;'"
```

**Backup database:**
```bash
ssh robertotcestari@64.176.5.254 "sudo mysqldump -u root financeiro_ratc > ~/backup-financeiro-$(date +%Y%m%d-%H%M%S).sql"
```

## Log Access in Production

Next.js application logs and system logs.

### Application Logs (Next.js)

**PM2 Logs (if using PM2):**
```bash
# View live logs (all apps)
ssh robertotcestari@64.176.5.254 "pm2 logs"

# View logs for specific app
ssh robertotcestari@64.176.5.254 "pm2 logs financeiro-ratc"

# View last 100 lines
ssh robertotcestari@64.176.5.254 "pm2 logs financeiro-ratc --lines 100"

# View error logs only
ssh robertotcestari@64.176.5.254 "pm2 logs financeiro-ratc --err"
```

**Custom Application Logs:**
```bash
# If logs are stored in application directory
ssh robertotcestari@64.176.5.254 "ls -lh /opt/financeiro-ratc/current/logs/"
ssh robertotcestari@64.176.5.254 "tail -f /opt/financeiro-ratc/current/logs/app.log"
```

### nginx Logs

**nginx access logs:**
```bash
ssh robertotcestari@64.176.5.254 "tail -f /var/log/nginx/access.log"
```

**nginx error logs:**
```bash
ssh robertotcestari@64.176.5.254 "tail -f /var/log/nginx/error.log"
```

**Site-specific logs (if configured):**
```bash
ssh robertotcestari@64.176.5.254 "tail -f /var/log/nginx/financeiro.ratc.com.br-error.log"
```

### System Logs - Services

**systemd service logs (if using systemd):**
```bash
ssh robertotcestari@64.176.5.254 "journalctl -u financeiro-ratc -n 100 -f"
```

**nginx service logs:**
```bash
ssh robertotcestari@64.176.5.254 "journalctl -u nginx -n 100"
```

**MySQL service logs:**
```bash
ssh robertotcestari@64.176.5.254 "journalctl -u mysql -n 100"
```

### Search and Filter Logs

**Find errors in nginx logs:**
```bash
ssh robertotcestari@64.176.5.254 "grep 'error' /var/log/nginx/error.log | tail -50"
```

**Find 500 errors in access logs:**
```bash
ssh robertotcestari@64.176.5.254 "grep '\" 500' /var/log/nginx/access.log | tail -20"
```

**Search PM2 logs for errors:**
```bash
ssh robertotcestari@64.176.5.254 "pm2 logs --err | grep -i error | tail -50"
```

### Download Logs Locally

**Copy nginx logs:**
```bash
scp robertotcestari@64.176.5.254:/var/log/nginx/error.log ./nginx-error-backup.log
```

**Copy PM2 logs:**
```bash
scp -r robertotcestari@64.176.5.254:~/.pm2/logs/ ./production-pm2-logs/
```

## Next.js Application Management

### Check Application Status

**PM2 status:**
```bash
ssh robertotcestari@64.176.5.254 "pm2 status"
```

**Check process:**
```bash
ssh robertotcestari@64.176.5.254 "ps aux | grep node"
```

### Restart Application

**Restart with PM2:**
```bash
ssh robertotcestari@64.176.5.254 "pm2 restart financeiro-ratc"

# Or restart all apps
ssh robertotcestari@64.176.5.254 "pm2 restart all"
```

**Restart systemd service (if applicable):**
```bash
ssh robertotcestari@64.176.5.254 "sudo systemctl restart financeiro-ratc"
```

### Monitor Application

**PM2 monitoring:**
```bash
ssh robertotcestari@64.176.5.254 "pm2 monit"
```

**Check memory usage:**
```bash
ssh robertotcestari@64.176.5.254 "pm2 list"
ssh robertotcestari@64.176.5.254 "ps aux | grep node | awk '{print \$2, \$4, \$6, \$11}'"
```

## Common Production Tasks

### Check Disk Space

```bash
ssh robertotcestari@64.176.5.254 "df -h"
```

### Monitor CPU/Memory

```bash
ssh robertotcestari@64.176.5.254 "top -b -n 1 | head -20"
```

### Check Network Connections

```bash
# Check if app is listening on port
ssh robertotcestari@64.176.5.254 "sudo ss -tlnp | grep node"

# Check firewall rules
ssh robertotcestari@64.176.5.254 "sudo ufw status"
```

### Restart Services

```bash
# Restart Next.js app (PM2)
ssh robertotcestari@64.176.5.254 "pm2 restart financeiro-ratc"

# Restart nginx
ssh robertotcestari@64.176.5.254 "sudo systemctl restart nginx"

# Restart MySQL
ssh robertotcestari@64.176.5.254 "sudo systemctl restart mysql"
```

### Clear Cache / Rebuild

```bash
# Clear Next.js cache
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && rm -rf .next"

# Rebuild (if needed - usually done during deployment)
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npm run build"

# Restart after rebuild
ssh robertotcestari@64.176.5.254 "pm2 restart financeiro-ratc"
```

### Check Current Deployment

```bash
# See current release
ssh robertotcestari@64.176.5.254 "ls -l /opt/financeiro-ratc/current"

# Check recent releases
ssh robertotcestari@64.176.5.254 "ls -lt /opt/financeiro-ratc/releases/ | head -5"

# Check recent commits (if git is available)
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && git log -5 --oneline"
```

### Environment Configuration

**View environment variables (be careful with sensitive data):**
```bash
ssh robertotcestari@64.176.5.254 "cat /opt/financeiro-ratc/shared/.env | grep -v 'PASSWORD\|SECRET\|KEY'"
```

**Check DATABASE_URL:**
```bash
ssh robertotcestari@64.176.5.254 "cat /opt/financeiro-ratc/shared/.env | grep DATABASE_URL"
```

## Prisma Database Operations

### Run Migrations

```bash
# Check migration status
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npx prisma migrate status"

# Run pending migrations
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npx prisma migrate deploy"
```

### Generate Prisma Client

```bash
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npx prisma generate"
```

### Open Prisma Studio (tunnel required)

```bash
# Create SSH tunnel to access Prisma Studio locally
ssh -L 5555:localhost:5555 robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && npx prisma studio"
```

## Security Considerations

1. **SSH Keys**: Ensure your SSH key is added to `~/.ssh/authorized_keys` on the server
2. **sudo Access**: Use `sudo` for privileged commands (requires password or sudo setup)
3. **Environment Variables**: Never expose sensitive data in logs or console output
4. **Database Credentials**: User `robertotcestari` for local access, `ratcfinanceiro` for remote
5. **Firewall**: Port 3306 is open for MySQL remote access - ensure strong passwords
6. **Backups**: Always ensure backups exist before making changes to production
7. **Shared Config**: `.env` and other shared config in `/opt/financeiro-ratc/shared/` - changes survive deployments
8. **Log Retention**: Archive important logs locally before clearing

## Troubleshooting

### Connection Issues

If you can't connect:
1. Verify SSH key is configured: `ssh-keyscan 64.176.5.254`
2. Check your SSH config: `~/.ssh/config`
3. Test connectivity: `ping 64.176.5.254`

### Permission Denied

If you get "Permission denied":
1. Verify the username is `robertotcestari`
2. Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
3. Ensure public key is on server: `cat ~/.ssh/id_rsa.pub`

### Service Issues

If services are not running:
1. Check service status: `sudo systemctl status SERVICE_NAME`
2. View service logs: `sudo journalctl -u SERVICE_NAME -n 50`
3. Restart service: `sudo systemctl restart SERVICE_NAME`

### Application Not Responding

If Next.js app isn't responding:
1. Check if process is running: `pm2 list` or `ps aux | grep node`
2. View recent logs: `pm2 logs financeiro-ratc --lines 100`
3. Restart app: `pm2 restart financeiro-ratc`
4. Check if bound to correct port: `sudo ss -tlnp | grep node`

### Database Connection Issues

If app can't connect to database:
1. Check MySQL is running: `sudo systemctl status mysql`
2. Verify database exists: `sudo mysql -u root -e 'SHOW DATABASES;'`
3. Check credentials in `.env`: `cat /opt/financeiro-ratc/shared/.env | grep DATABASE_URL`
4. Test connection: `mysql -u robertotcestari -p financeiro_ratc`
5. Check MySQL bind-address: `sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf`

### High Memory Usage

If Node.js is consuming too much memory:
1. Check memory usage: `pm2 list` or `ps aux | grep node`
2. Restart application: `pm2 restart financeiro-ratc`
3. Review application logs for memory leaks
4. Consider increasing server RAM or optimizing queries

### nginx 502 Bad Gateway

If you see 502 errors in nginx:
1. Check if Next.js app is running: `pm2 status`
2. Check nginx proxy configuration: `sudo nginx -t`
3. Check nginx error log: `tail -f /var/log/nginx/error.log`
4. Restart app and nginx: `pm2 restart financeiro-ratc && sudo systemctl restart nginx`

### MySQL Can't Reach Server

If getting "Can't reach database server":
1. Check MySQL is running: `sudo systemctl status mysql`
2. Check MySQL is listening: `sudo ss -tlnp | grep 3306`
3. Check bind-address (should be `0.0.0.0` for remote access): `sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf`
4. Check firewall allows port 3306: `sudo ufw status | grep 3306`
5. Restart MySQL: `sudo systemctl restart mysql`

## When to Use This Skill

Use this skill when you need to:
- ✅ Connect to the production server
- ✅ Debug production issues
- ✅ Access and analyze production logs
- ✅ Monitor real-time log streams
- ✅ Check server logs and metrics
- ✅ Manage services and processes
- ✅ Work with MySQL database
- ✅ Run Prisma migrations
- ✅ Transfer files to/from production
- ✅ Run maintenance commands
- ✅ Troubleshoot deployment issues
- ✅ Monitor performance and resource usage
- ✅ Manage Next.js application
- ✅ Configure firewall and network settings

## Related Resources

- CLAUDE.md deployment section for CI/CD information
- Server management documentation
- Next.js documentation: https://nextjs.org/docs
- Prisma documentation: https://www.prisma.io/docs
- PM2 documentation: https://pm2.keymetrics.io/docs
