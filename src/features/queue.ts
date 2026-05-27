import type {
  GuildMember,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import type { Player, Track, TrackEndEvent } from "shoukaku";

import { shoukaku } from "../lavalink";

export interface QueueTrack {
  track: Track;
  requestedBy?: GuildMember;
}

type QueueListener = (queue: GuildQueue) => void;

const queues = new Map<string, GuildQueue>();
const listeners = new Set<QueueListener>();

function notifyChange(queue: GuildQueue): void {
  for (const listener of listeners) {
    try {
      listener(queue);
    } catch {
      // Erro no listener nunca derruba o queue.
    }
  }
}

export function onQueueChange(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export class GuildQueue {
  current: QueueTrack | null = null;
  private upcoming: QueueTrack[] = [];
  private destroyed = false;
  private waitingForTrack = false;

  constructor(
    public readonly guildId: string,
    public readonly player: Player,
    public voiceChannel: VoiceBasedChannel,
    public textChannel: TextBasedChannel,
  ) {
    this.wirePlayerEvents();
  }

  get tracks(): QueueTrack[] {
    return this.upcoming.slice();
  }

  get size(): number {
    return this.upcoming.length;
  }

  enqueue(item: QueueTrack): void {
    this.upcoming.push(item);
    notifyChange(this);
    void this.playIfIdle();
  }

  enqueueMany(items: QueueTrack[]): void {
    this.upcoming.push(...items);
    notifyChange(this);
    void this.playIfIdle();
  }

  /** Insere na posição 1 (próxima após a atual). Usado pelo $torugo. */
  insertNext(item: QueueTrack): void {
    this.upcoming.unshift(item);
    notifyChange(this);
    void this.playIfIdle();
  }

  async skip(): Promise<void> {
    // stopTrack dispara o evento 'end' com reason='stopped', que avança a fila.
    await this.player.stopTrack().catch(() => {});
  }

  async stop(): Promise<void> {
    this.upcoming = [];
    this.current = null;
    await this.player.stopTrack().catch(() => {});
    notifyChange(this);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.upcoming = [];
    this.current = null;
    queues.delete(this.guildId);
    await shoukaku.leaveVoiceChannel(this.guildId).catch(() => {});
    notifyChange(this);
  }

  private async playIfIdle(): Promise<void> {
    if (this.destroyed) return;
    if (this.current || this.waitingForTrack) return;
    await this.playNext();
  }

  private async playNext(): Promise<void> {
    if (this.destroyed) return;
    const next = this.upcoming.shift();
    if (!next) {
      this.current = null;
      notifyChange(this);
      // Sem mais tracks: desconecta após pequeno delay implícito (no end-of-queue não esperamos).
      await this.destroy();
      return;
    }
    this.current = next;
    this.waitingForTrack = true;
    try {
      await this.player.playTrack({ track: { encoded: next.track.encoded } });
    } catch (error) {
      console.error(
        `[queue ${this.guildId}] playTrack falhou:`,
        error instanceof Error ? error.message : error,
      );
      this.waitingForTrack = false;
      this.current = null;
      await this.playNext();
    }
  }

  private wirePlayerEvents(): void {
    this.player.on("start", () => {
      this.waitingForTrack = false;
      notifyChange(this);
    });
    this.player.on("end", (event: TrackEndEvent) => {
      // 'stopped' = skip manual; 'replaced' = playTrack chamado em cima.
      // Em ambos os casos NÃO chamamos playNext (o handler que pediu o stop é responsável).
      if (event.reason === "replaced") return;
      this.waitingForTrack = false;
      this.current = null;
      void this.playNext();
    });
    this.player.on("stuck", () => {
      console.warn(`[queue ${this.guildId}] track stuck — pulando`);
      this.waitingForTrack = false;
      this.current = null;
      void this.playNext();
    });
    this.player.on("exception", (event) => {
      console.error(
        `[queue ${this.guildId}] track exception:`,
        event.exception?.message,
      );
      this.waitingForTrack = false;
      this.current = null;
      void this.playNext();
    });
    this.player.on("closed", (event) => {
      console.warn(
        `[queue ${this.guildId}] websocket closed (${event.code}): ${event.reason}`,
      );
      void this.destroy();
    });
  }
}

export function getQueue(guildId: string): GuildQueue | undefined {
  return queues.get(guildId);
}

export async function getOrCreateQueue(
  guildId: string,
  voiceChannel: VoiceBasedChannel,
  textChannel: TextBasedChannel,
): Promise<GuildQueue> {
  const existing = queues.get(guildId);
  if (existing) {
    existing.voiceChannel = voiceChannel;
    existing.textChannel = textChannel;
    return existing;
  }

  const player = await shoukaku.joinVoiceChannel({
    guildId,
    channelId: voiceChannel.id,
    shardId: voiceChannel.guild.shardId,
    deaf: true,
  });

  const queue = new GuildQueue(guildId, player, voiceChannel, textChannel);
  queues.set(guildId, queue);
  return queue;
}
