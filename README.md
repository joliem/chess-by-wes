# chess-by-wes

A growing collection of original chess variants. The variants were
dreamed up and play-tested together with my son Wesley (age 7).

**Play it live: https://chess-by-wes.jolie.workers.dev**

Each variant keeps standard chess rules with one new idea layered on top. All of them can be played
pass-and-play on a single screen, or online from two different devices with no account needed.

## The variants

- **Switcheroo Chess** (`/switcheroo`) — before each move there's a 1-in-10 chance the board spins: you play a move as your opponent and they play a move as you, each of you trying to blunder as badly as possible! 
- **Treasure Chess** (`/treasure`) — 3 gold and 3 silver coins are hidden on the middle four ranks. Land on one and it goes into your treasure chest. Use a silver coin to make a piece temporarily invincible; use a gold coin to give a piece temporary queen powers. If you reach a stalemate, the bigger treasure stockpile wins (1 gold = 2 silver).
- **Battleship Bishop** (`/battleship`) — each player has one bishop that's camouflaged to the enemy as it moves along squares of the same color. It can only be captured with a correct Battleship-style guess of its location, or it can reveal itself to take the enemy by surprise from an advantageous position.

## Online play

From the home page, pick a variant and create a game link, then send the URL to your opponent.
Moves are validated on the server and synced in realtime, and hidden information (hidden coin locations, camouflaged pieces) is masked per player on the server, so neither side can peek or cheat.

## Development

Requires Node.js and npm.

```sh
git clone <this-repository-url>
cd chess-by-wes
npm i
npm run dev
```

## Deploying to Cloudflare Workers

The app can be hosted independently on Cloudflare Workers. After signing in with Wrangler, add the
three server-side Supabase values as encrypted Worker secrets:

```sh
bunx wrangler login
bunx wrangler secret put SUPABASE_URL
bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bun run deploy
```

The `VITE_SUPABASE_*` values are read from `.env` at build time. Never commit `.env`, `.dev.vars`,
or the Supabase service-role key.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (Postgres, Realtime)
