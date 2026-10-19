# Production scalability and traffic-management notes

## Current deployment

PandalGo currently runs as one Node.js web service on Render (`pandalgo-backend`) with MongoDB Atlas as its database and Vercel serving the React client. There is no Nginx, Docker Compose, worker process, Redis instance, or multi-replica load balancer in the repository. Horizontal load balancing is therefore not active yet.

The application is safe to run as independent processes: authentication state and application data are stored in MongoDB, and the server port is controlled by `PORT`. Process-local caches and rate-limit counters are intentionally not described as globally shared.

## Reliability changes

- `/api/live` is a lightweight liveness endpoint.
- `/api/ready` checks MongoDB readiness and is the Render health-check path.
- `/api/health` remains available for backwards compatibility.
- Requests receive an `x-request-id`, timeout protection, and structured completion logs with method, route, status, and duration.
- SIGTERM/SIGINT stop new connections, drain the HTTP server, close MongoDB, and exit after `SHUTDOWN_TIMEOUT_MS`.
- MongoDB pool sizing is configurable with `DB_MAX_POOL_SIZE` and `DB_MIN_POOL_SIZE`.
- TomTom/OSRM traffic requests are deduplicated per rounded coordinate and successful results are cached briefly; provider failures continue through the existing fallback path.
- Rate limits are configurable. They use the in-process store because the current deployment has one instance.

## Scaling to multiple Render instances

Do not scale replicas and assume the current rate limiting/cache behavior is globally consistent. Before enabling multiple instances:

1. Add a shared Redis-compatible store and configure the rate limiter and shared cache to use it.
2. Keep MongoDB pool sizes small enough that `replicas × DB_MAX_POOL_SIZE` stays within the Atlas tier's connection capacity.
3. Use Render's native load balancing with `/api/ready` for health-based routing.
4. Keep scheduled work in one worker or add a distributed lock; do not start duplicate periodic jobs in every web replica.
5. Run a staged load test against a non-production environment before increasing replicas.

## Local verification

```bash
npm run build:all
NODE_ENV=test npm --prefix server test
```

The integration tests require a reachable MongoDB test database or `USE_MEMORY_DB=true`; they must not be pointed at production data.
