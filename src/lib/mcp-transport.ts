import { spawn, type ChildProcess } from "node:child_process";
import type { JSONRPCMessage } from "ai";

export interface StdioServerParameters {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export class StdioTransport {
  private proc: ChildProcess | null = null;
  private buf = "";
  private _onclose?: () => void;
  private _onerror?: (error: Error) => void;
  private _onmessage?: (message: JSONRPCMessage) => void;

  get onclose() { return this._onclose; }
  set onclose(fn: (() => void) | undefined) { this._onclose = fn; }

  get onerror() { return this._onerror; }
  set onerror(fn: ((error: Error) => void) | undefined) { this._onerror = fn; }

  get onmessage() { return this._onmessage; }
  set onmessage(fn: ((message: JSONRPCMessage) => void) | undefined) { this._onmessage = fn; }

  constructor(private params: StdioServerParameters) {}

  async start(): Promise<void> {
    const { command, args, env, cwd } = this.params;
    this.proc = spawn(command, args ?? [], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd,
      env: env ? { ...process.env, ...env } : undefined,
    });

    this.proc.stdout!.on("data", (chunk: Buffer) => {
      this.buf += chunk.toString();
      const lines = this.buf.split("\n");
      this.buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          this._onmessage?.(msg);
        } catch { /* ignore malformed */ }
      }
    });

    this.proc.on("close", () => this._onclose?.());
    this.proc.on("error", (err) => this._onerror?.(err));
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.proc?.stdin?.write(JSON.stringify(message) + "\n");
  }

  async close(): Promise<void> {
    this.proc?.kill();
    this.proc = null;
  }
}
