# Deploying Encore

No server has been provisioned or public site deployed by this implementation.

## Local production build

```sh
npm ci
npm run build
npm start
```

With `NODE_ENV=development`, visit `http://localhost:3001`. Set `APP_ORIGIN` to that origin if using a custom local hostname. Development server URLs on localhost are allowed for local testing.

## Vultr or another Docker host

1. Provision a host, point your domain to it, and install Docker plus your preferred HTTPS reverse proxy.
2. Copy `.env.example` to `.env`. Set `NODE_ENV=production`, `APP_ORIGIN=https://your-domain`, and production credentials. Do not upload `.env` to Git.
3. Configure Tiger Data's PostgreSQL connection URL with the provider's required TLS settings. Leaving `DATABASE_URL` empty uses SQLite in the persistent Docker volume, suitable only for a single-instance small pilot. Existing SQLite data is not automatically migrated to PostgreSQL.
4. Configure a private S3-compatible bucket and scoped credentials, or keep local photo storage in the persistent volume.
5. Run `docker compose up -d --build`. The app binds only to host loopback port 3001. The reverse proxy should forward HTTPS traffic to `127.0.0.1:3001` and preserve the original host.
6. If the app has exactly one trusted reverse proxy, add `TRUST_PROXY=1` to `.env` so rate limits use client IPs. Do not set it with a publicly reachable untrusted upstream.
7. Check `/api/health`, registration/login, private image access, seller approval, model failure handoff, and an actual backup restore before inviting testers.

Example Caddy configuration:

```caddyfile
encore.example.com {
    reverse_proxy 127.0.0.1:3001
}
```

Replace the example hostname. TLS is required for production sessions. Configure provider email delivery and verify the sending domain before enabling email updates. No payment credentials or private keys are stored by Encore.

## Operations

- Run one application instance initially. The message lock and mail worker are process-local; scaling needs a distributed queue/lock strategy and PostgreSQL concurrency validation.
- Back up the database and uploaded images; avoid copying a live SQLite file without a consistent backup procedure.
- Review stored reports manually during the pilot and establish a response process.
- Retention currently removes expired sessions, old idempotency entries, old notifications, and old messages without active requests. Other data is removed through account/listing deletion as documented in the architecture.
- Do not seed publicly known demo accounts into a deployment. The seed command refuses `NODE_ENV=production`.
- Run `npm audit`, tests, evaluation, and build in CI. Test adapter changes against the actual configured services before rollout.

The Docker build and hosted integrations require a Docker host and service credentials; they have not been live-tested in this workspace.
