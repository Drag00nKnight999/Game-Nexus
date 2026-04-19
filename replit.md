# GameNexus

A React + Express browser games platform with user authentication, community chat, admin tools, player profiles, and a user-created games feature with AI assistance.

## Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router v6, Lucide React
- **Backend**: Express.js, TypeScript, in-memory storage (MemStorage)
- **Auth**: Cookie-based sessions (7-day expiry), bcrypt password hashing
- **AI**: OpenAI GPT-4o-mini (with template-based fallback if no API key)
- **File uploads**: Multer (admin game uploads up to 500 MB)

## Architecture

- `server/index.ts` — Express entry point, serves Vite dev server in dev, static files in prod
- `server/routes.ts` — All API routes, session management, rank system
- `server/storage.ts` — In-memory storage: users, sessions, games, profiles
- `client/src/App.tsx` — React app with routes
- `client/src/hooks/useAuth.ts` — Auth context provider

## Rank System

`owner` > `developer` > `admin` > `user`

- **owner** — Drag00nKnightOFFICIAL only. Full access, yellow OWNER badge.
- **developer** — Full admin + moderate access, purple DEV badge.
- **admin** — Moderate access (set via admin panel), orange ADMIN badge.
- **user** — Standard member.

## Premium

Unlocked automatically when a user publishes their first public game.
Benefits: 50 AI requests/day (vs 5 for free), Premium badge on profile and home header.

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Home — featured games, community games section |
| `/login` | Sign in / Register |
| `/chat` | Community chat (authenticated) |
| `/dashboard` | User's game dashboard (authenticated) |
| `/editor` | Create a new game (authenticated) |
| `/editor/:gameId` | Edit an existing game (authenticated) |
| `/play/:gameId` | View/play a published community game |
| `/settings` | Account settings — bio, avatar color (authenticated) |
| `/profile/:username` | Public player profile |
| `/admin` | Admin panel (admin+ only) |
| `/privacy`, `/terms`, `/guidelines` | Legal pages |

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current user info + isPremium |
| GET | `/api/settings` | Get own profile settings |
| PUT | `/api/settings` | Update bio, avatarColor |
| GET | `/api/games/public` | All public community games |
| GET | `/api/games/my` | Current user's games |
| POST | `/api/games` | Create new game |
| GET | `/api/games/:id` | Get a game by ID |
| PUT | `/api/games/:id` | Update game code/title/description |
| POST | `/api/games/:id/publish` | Toggle public/private (grants Premium on first publish) |
| DELETE | `/api/games/:id` | Delete game |
| POST | `/api/ai/assist` | AI game assistant (rate-limited: 5/day free, 50/day premium) |
| GET | `/api/ai/status` | AI usage status |
| GET | `/api/profile/:username` | Public profile data |

## Developer Account

- Username: `Drag00nKnightOFFICIAL`
- Password: `bloxdhop2025`
- Rank: `owner`
- Join date: fixed at 2025-01-01

## Notes

- Storage is in-memory — data resets on server restart. For persistence, migrate to PostgreSQL.
- OpenAI integration requires `OPENAI_API_KEY` env secret. Falls back to template responses without it.
- Admin password for admin panel login is set via `ADMIN_PASSWORD` env var (default: `admin123`).
