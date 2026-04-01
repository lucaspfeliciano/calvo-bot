# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Bot

```bash
node index.js        # Start the bot
npm install          # Install dependencies
```

Requires a `.env` file (or environment variable) with:
- `TOKEN` — Discord bot token (required)
- `SOUNDCLOUD_CLIENT_ID` — optional, fetched automatically if absent

No test framework or linter is configured.

## Architecture

The entire bot lives in a single file: **`index.js`** (~2500 lines). There are no modules or separate files beyond static images in `public/`.

**Command prefix:** `$`

**Main handlers in `index.js`:**
- `client.on('messageCreate')` — routes `$` commands
- `client.on('interactionCreate')` — handles button clicks and select menus (music controls, game selections)
- `AudioPlayerStatus.Idle` event — advances the music queue

### Music system

- Queue stored in a `Map<guildId, GuildQueue>` called `queues`
- `resolveSongs()` resolves a query/URL to playable tracks across YouTube, Spotify (→ search), and SoundCloud
- `playMusic()` streams audio via `play-dl`; on failure tries fallback search
- Playlist collection capped at `MAX_COLLECTION_TRACKS = 30`
- SoundCloud token is lazy-loaded via `ensureSoundCloudReady()`

### Game sessions

Active game sessions are held in in-memory Maps (cleared when game ends or bot restarts):

| Map | Game |
|-----|------|
| `mixSessions` | `$mix` — 5v5 team draft |
| `picksSessions` | `$picks` — CS map veto |
| `csLobbySessions` | `$ramon` — CS lobby signup |

### Hardcoded constants

Key IDs and settings live at the top of `index.js` (lines ~23–115):
- `JEFF_USER_ID` — target user for mute/unmute commands
- `RAMON_LIST_CHANNEL_ID` — channel where `$ramon` posts
- `TORUGO_URL` — fallback YouTube URL for `$torugo`
- `CS_MAP_POOL`, `MIX_TEAM_SIZE`, `POKER_REVEAL_DELAY_MS`, etc.

### Key functions

| Function | Role |
|----------|------|
| `createGuildQueue()` | Initialize voice connection and audio player for a guild |
| `resolveSongs()` | Resolve a query/URL to track list (multi-source) |
| `playMusic()` | Stream next song; handles fallback and queue advancement |
| `runNetinhoPoker()` | Animated Texas Hold'em poker game |
| `startMixCommand()` | Initialize 5v5 team draft |
| `evaluateSevenCards()` / `compareHandsDesc()` | Poker hand evaluation |
| `searchBestMatch()` | Multi-source music search with source priority |
