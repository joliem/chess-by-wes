interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

async function pingSupabase(env: Env): Promise<void> {
  const endpoint = new URL("/rest/v1/games", env.SUPABASE_URL);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase heartbeat failed with HTTP ${response.status}`);
  }

  console.log("Supabase heartbeat succeeded");
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(pingSupabase(env));
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    await pingSupabase(env);
    return new Response("Supabase heartbeat succeeded\n");
  },
};
