export class Logger {
  private static debugEnabled = false;

  static setDebugEnabled(enabled: boolean): void {
    Logger.debugEnabled = enabled;
  }

  static debug(message: string, context?: unknown): void {
    if (!Logger.debugEnabled) return;
    if (context === undefined) {
      console.debug(message);
      return;
    }
    console.debug(message, Logger.redact(context));
  }

  static warn(message: string, context?: unknown): void {
    if (context === undefined) {
      console.warn(message);
      return;
    }
    console.warn(message, Logger.redact(context));
  }

  static error(message: string, context?: unknown): void {
    if (context === undefined) {
      console.error(message);
      return;
    }
    console.error(message, Logger.redact(context));
  }

  private static redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => Logger.redact(item));
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        /apiKey|key|token|authorization/i.test(key) ? "[REDACTED]" : Logger.redact(entry),
      ])
    );
  }
}
