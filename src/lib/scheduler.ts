import { schedule } from "node-cron";
import type { ScheduledTask } from "node-cron";
import { logger } from "./logger.js";

const adjectives = [
  "happy", "brave", "calm", "eager", "fierce", "gentle", "jolly", "keen",
  "lively", "proud", "shy", "swift", "witty", "zealous", "bold", "bright",
  "cool", "crazy", "daring", "elegant", "fancy", "golden", "hidden", "icy",
  "jumpy", "lucky", "neat", "odd", "quiet", "rapid", "silly", "tiny",
];

const nouns = [
  "curie", "hopper", "turing", "lovelace", "babbage", "booth", "hamilton",
  "chomsky", "knuth", "ritchie", "thompson", "torvalds", "berners",
  "cerf", "dijkstra", "perlman", "shannon", "stroustrup", "wirth",
  "gosling", "hejlsberg", "kildall", "lamport", "matsumoto",
  "norvig", "pike", "russell", "sutherland", "wall",
];

function randomName(): string {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  return `${a}_${n}`;
}

export interface TaskInfo {
  name: string;
  description: string;
  cron: string;
  prompt: string;
  nextRun: string | null;
}

interface Task {
  info: TaskInfo;
  job: ScheduledTask;
}

export class Scheduler {
  private tasks = new Map<string, Task>();
  private runner: ((prompt: string) => Promise<string | undefined>) | null = null;

  setRunner(fn: (prompt: string) => Promise<string | undefined>) {
    this.runner = fn;
  }

  add(cron: string, prompt: string, description: string): string {
    const name = randomName();
    const job = schedule(cron, async () => {
      logger.info("SCHEDULER", `executing task "${name}"`, { cron, prompt: prompt.slice(0, 80) });
      if (!this.runner) {
        logger.warn("SCHEDULER", "no runner configured");
        return;
      }
      try {
        const result = await this.runner(prompt);
        logger.info("SCHEDULER", `task "${name}" done`, { hasResult: !!result });
      } catch (err: any) {
        logger.error("SCHEDULER", `task "${name}" failed`, { error: err.message });
      }
    }, { name });

    const info: TaskInfo = {
      name,
      description,
      cron,
      prompt,
      nextRun: job.getNextRun()?.toISOString() ?? null,
    };

    this.tasks.set(name, { info, job });
    logger.info("SCHEDULER", "task scheduled", { name, cron, description });
    return name;
  }

  list(): TaskInfo[] {
    return Array.from(this.tasks.values()).map((t) => ({
      ...t.info,
      nextRun: t.job.getNextRun()?.toISOString() ?? null,
    }));
  }

  remove(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    task.job.stop();
    task.job.destroy();
    this.tasks.delete(name);
    logger.info("SCHEDULER", "task deleted", { name });
    return true;
  }
}

export const scheduler = new Scheduler();
