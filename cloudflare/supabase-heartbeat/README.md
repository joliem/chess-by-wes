# Supabase heartbeat

This small, separate Cloudflare Worker keeps the free Supabase project active by
making one read-only database request three times per day. It does not create,
change, or delete any game records, and it does not affect the main Chess by Wes
Worker deployment.

The schedule is stored in `wrangler.jsonc` and runs at 00:15, 08:15, and 16:15
UTC. The Supabase publishable key is safe to include because it is the same
public client key shipped with the web application; row-level security remains
in effect.

## Deploy or update

From the repository root:

```sh
bunx wrangler deploy --config cloudflare/supabase-heartbeat/wrangler.jsonc
```

## Test immediately

After deploying, open the Worker's `workers.dev` URL. A successful request
returns `Supabase heartbeat succeeded` and also appears in its Cloudflare logs.
