# PgBouncer Setup for Multi-Tenant Environment

To prevent PostgreSQL `max_connections` exhaustion when handling multiple tenants in our database-per-tenant architecture, we use **PgBouncer** in **Transaction Mode**.

## Why PgBouncer?
In our architecture, the Node.js backend creates a connection pool per tenant. If 20+ tenants are active and each maintains connections, we can easily exceed Postgres's default limit (typically 100). PgBouncer acts as a middleware connection pooler, keeping a small number of actual connections to Postgres while accepting thousands of incoming connections from the Node.js clients.

## Configuration Guide

### 1. Installation
Install PgBouncer on your database server or a dedicated instance:
```bash
sudo apt-get update
sudo apt-get install pgbouncer
```

### 2. Configure `pgbouncer.ini`
Edit `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
# Use wildcard to match any tenant database dynamically
* = host=127.0.0.1 port=5432

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Transaction pooling is critical for our Node.js app
pool_mode = transaction

# Connection limits
max_client_conn = 10000
default_pool_size = 20
max_db_connections = 50
reserve_pool_size = 5

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 600
```

### 3. Configure Authentication (`userlist.txt`)
Extract the hashed password for your PostgreSQL user:
```sql
SELECT usename, passwd FROM pg_shadow WHERE usename = 'your_db_user';
```
Add it to `/etc/pgbouncer/userlist.txt`:
```text
"your_db_user" "md5_hashed_password"
```

### 4. Restart PgBouncer
```bash
sudo systemctl restart pgbouncer
```

## Application Changes
Update the environment variables in your deployment to point the Node.js backend to PgBouncer instead of Postgres directly:

```env
# Before
DATABASE_URL=postgres://user:pass@localhost:5432/master_db
# After
DATABASE_URL=postgres://user:pass@localhost:6432/master_db
```

The application's `companyDatabaseRouter.js` has already been updated to limit the connection pool size (`max: 3`) internally, which aligns perfectly with PgBouncer's transaction mode pooling.
