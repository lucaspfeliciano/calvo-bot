# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Bot

```bash
npm install            # Install dependencies
npm run dev            # Run with tsx in watch mode (TypeScript directly)
npm run build          # Compile TS to dist/
npm start              # Run compiled JS (dist/index.js)
npm run typecheck      # tsc --noEmit
```

Requires a `.env` file (or environment variables) with:
- `TOKEN` — Discord bot token (required)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — optional, enable Spotify links

No test framework or linter is configured.

## Architecture

TypeScript project. Source in `src/`, compiled output in `dist/`.

**Command prefix:** `$`

### Layout

```
src/
  index.ts                # Bootstrap: env check, register events, login
  config.ts               # IDs, URLs, delays, env vars
  client.ts               # Discord.js Client (singleton)
  distube.ts              # DisTube instance with YouTube/Spotify/SoundCloud plugins
  types.ts                # Shared types (Command, sessions, poker hands)
  data/                   # Static lists (quotes, symptoms, map pool)
  utils/                  # random, time, discord helpers
  features/
    player-panel.ts       # Music control embed + buttons (state Map)
    torugo.ts             # Torugo song picker
    poker/                # Texas Hold'em (deck, evaluator, embed, runner)
    mix.ts                # 5v5 draft session + interaction handler
    picks.ts              # Map veto session + interaction handler
    cs-lobby.ts           # CS lobby signup + interaction handler
    malafa.ts             # Symptom triage select menu + handler
    moderation.ts         # muteJeff, unmuteJeff, theKiller
  commands/
    index.ts              # Registry + name → command lookup
    music.ts              # $play, $skip, $stop, $leave, $now, $queue, $torugo
    games.ts              # $netinho, $mix, $picks, $ramon
    moderation.ts         # $jeff/$calvo, $pjl/$desmutajeff, $thekiller, $caslu
    misc.ts               # $comandos, $malafa, $tadeu, $eduardo, $cadinho, $gui, $lg, $lemos
  events/
    ready.ts              # client ready log
    messageCreate.ts      # Command dispatcher
    interactionCreate.ts  # Button/select menu router
    distube.ts            # DisTube event listeners (playSong, addSong, etc.)
```

### Music system

- Uses **DisTube v5** with `@distube/youtube`, `@distube/spotify`, `@distube/soundcloud`.
- DisTube owns the queue; the local `playerPanels` Map only tracks the control message per guild.
- `registerPlayerPanel(guildId, channel)` is called before `distube.play()` so the panel knows where to post.
- DisTube events (`playSong`, `addSong`, `addList`, `finish`, `disconnect`, `error`) call `updatePlayerPanel()` / `disablePlayerPanel()`.

### Game sessions

Each feature owns its own in-memory `Map<sessionId, Session>` (cleared on game end or restart):

| File | Game |
|------|------|
| `features/mix.ts` | `$mix` — 5v5 team draft |
| `features/picks.ts` | `$picks` — CS map veto |
| `features/cs-lobby.ts` | `$ramon` — CS lobby signup |

### Adding a new command

1. Implement the handler in `src/features/<feature>.ts` (or reuse an existing one).
2. Export a `Command` object in `src/commands/<group>.ts` (set `requiresVoice: true` if it needs a voice channel).
3. Push the command into the group's array (e.g. `musicCommands`). The registry in `commands/index.ts` picks it up automatically.

### Hardcoded constants

In `src/config.ts`:
- `JEFF_USER_ID` — target user for mute/unmute commands
- `RAMON_LIST_CHANNEL_ID` — channel where the lobby was originally posted
- `TORUGO_URL` / `TORUGO_FALLBACK_QUERIES` — used by `$torugo`
- `POKER_REVEAL_DELAY_MS`, `POKER_BURN_DELAY_MS`, `MIX_TEAM_SIZE`

Map pool lives in `src/data/maps.ts`. Quotes/symptoms in `src/data/quotes.ts`.
