# Production Access Reference

Use this reference when the monthly report workflow needs access to production for backup, verification, logs, or basic application checks.

For the full operational guide, see the `production-ssh-access` skill.

## Server

- Host: `64.176.5.254`
- User: `robertotcestari`
- Application root: `/opt/financeiro-ratc/current`
- Shared config: `/opt/financeiro-ratc/shared/.env`
- Database: `financeiro_ratc`

## Basic SSH Access

```bash
ssh robertotcestari@64.176.5.254
```

## Monthly Report: Most Relevant Commands

### Diagnose backup execution

```bash
ssh robertotcestari@64.176.5.254 "cd /opt/financeiro-ratc/current && pm2 logs financeiro-ratc --lines 100"
ssh robertotcestari@64.176.5.254 "ls -lh /opt/financeiro-ratc/shared/backups | tail"
```

### Check application status

```bash
ssh robertotcestari@64.176.5.254 "pm2 status"
ssh robertotcestari@64.176.5.254 "pm2 list"
```

### Check MySQL status

```bash
ssh robertotcestari@64.176.5.254 "sudo systemctl status mysql"
```

### Check recent application errors

```bash
ssh robertotcestari@64.176.5.254 "pm2 logs financeiro-ratc --lines 100"
ssh robertotcestari@64.176.5.254 "pm2 logs financeiro-ratc --err"
```

### Check nginx errors

```bash
ssh robertotcestari@64.176.5.254 "tail -f /var/log/nginx/error.log"
ssh robertotcestari@64.176.5.254 "grep 'error' /var/log/nginx/error.log | tail -50"
```

### Check service logs

```bash
ssh robertotcestari@64.176.5.254 "journalctl -u financeiro-ratc -n 100"
ssh robertotcestari@64.176.5.254 "journalctl -u mysql -n 100"
ssh robertotcestari@64.176.5.254 "journalctl -u nginx -n 100"
```

## Operational Notes

- If `RATC_API_URL` and `RATC_API_KEY` are not exported locally, load them from the project's `.env` before running API scripts.
- For the monthly-report workflow, prefer `POST $RATC_API_URL/backups` as the primary backup path.
- In production, backups should be written to `/opt/financeiro-ratc/shared/backups` unless `BACKUP_DIR` overrides the destination.
- For production-side validation, application configuration is stored in `/opt/financeiro-ratc/shared/.env`.
- Do not edit files directly on production unless it is an emergency debugging situation.
- Prefer the deployment pipeline for code changes.
- If backup, import, or checks fail in a way that suggests infrastructure issues, inspect PM2, MySQL, nginx, and the shared backup directory before retrying.
- If database credentials are needed, read them from `/opt/financeiro-ratc/shared/.env` on the server.
