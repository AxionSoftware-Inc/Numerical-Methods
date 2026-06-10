import type { VideoLabCommand } from "./types";

export class VideoLabCommandRegistry {
  private readonly commands = new Map<string, VideoLabCommand>();

  register(command: VideoLabCommand): void {
    this.commands.set(command.name, command);

    command.aliases?.forEach((alias) => {
      this.commands.set(alias, command);
    });
  }

  registerMany(commands: VideoLabCommand[]): void {
    commands.forEach((command) => this.register(command));
  }

  get(name: string | undefined): VideoLabCommand | null {
    if (!name) return null;
    return this.commands.get(name) ?? null;
  }

  has(name: string | undefined): boolean {
    if (!name) return false;
    return this.commands.has(name);
  }

  list(): VideoLabCommand[] {
    const unique = new Map<string, VideoLabCommand>();

    this.commands.forEach((command) => {
      unique.set(command.name, command);
    });

    return [...unique.values()];
  }

  names(): string[] {
    return this.list()
      .map((command) => command.name)
      .sort();
  }
}

export const videoLabCommandRegistry = new VideoLabCommandRegistry();

export function registerVideoLabCommand(command: VideoLabCommand): void {
  videoLabCommandRegistry.register(command);
}

export function registerVideoLabCommands(commands: VideoLabCommand[]): void {
  videoLabCommandRegistry.registerMany(commands);
}

export function getVideoLabCommand(name: string | undefined): VideoLabCommand | null {
  return videoLabCommandRegistry.get(name);
}

export function listVideoLabCommands(): VideoLabCommand[] {
  return videoLabCommandRegistry.list();
}

export function listVideoLabCommandNames(): string[] {
  return videoLabCommandRegistry.names();
}