import "dotenv/config";
import { spawn } from "node:child_process";

type RunResult = { code: number; signal: NodeJS.Signals | null };

function run(
  command: string,
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv; stdio?: "inherit" | "ignore" }
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: opts?.stdio ?? "inherit",
      env: opts?.env ? { ...process.env, ...opts.env } : process.env,
    });

    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code: code ?? 0, signal }));
  });
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForPostgresReady() {
  const timeoutMs = 30_000;
  const started = Date.now();
  let attempt = 0;
  let lastNoticeAt = 0;

  while (Date.now() - started < timeoutMs) {
    attempt++;
    const res = await run(
      "docker",
      ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "dev_user", "-d", "postgres_dev"],
      { stdio: "ignore" }
    );

    if (res.code === 0) {
      console.log(
        `[smoke:full] Postgres ready after ${Math.round((Date.now() - started) / 1000)}s`
      );
      return;
    }

    const now = Date.now();
    if (now - lastNoticeAt > 2000) {
      console.log(`[smoke:full] Waiting for postgres... (attempt ${attempt})`);
      lastNoticeAt = now;
    }
    await sleep(750);
  }

  throw new Error("Timed out waiting for Postgres to become ready");
}

function startWorker(): {
  waitReady: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const env = { ...process.env, TWITTER_DRY_RUN: "1" };
  const child = spawn("pnpm", ["run", "worker"], { env, stdio: ["ignore", "pipe", "pipe"] });

  let readyResolve: (() => void) | null = null;
  let readyReject: ((err: Error) => void) | null = null;
  const readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const onData = (chunk: Buffer) => {
    const s = chunk.toString("utf8");
    process.stdout.write(s);
    if (s.includes("worker_started") && readyResolve) {
      readyResolve();
      readyResolve = null;
      readyReject = null;
    }
  };

  const onErr = (chunk: Buffer) => {
    const s = chunk.toString("utf8");
    process.stderr.write(s);
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onErr);

  child.on("exit", (code, signal) => {
    if (readyReject) {
      readyReject(new Error(`Worker exited before ready (code=${code}, signal=${signal})`));
      readyResolve = null;
      readyReject = null;
    }
  });

  const stop = async () => {
    if (child.killed) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
        resolve();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  };

  return {
    waitReady: () => readyPromise,
    stop,
  };
}

async function main() {
  const startedAt = Date.now();
  let worker: ReturnType<typeof startWorker> | null = null;

  try {
    console.log("[smoke:full] Starting postgres+redis...");
    const up = await run("docker", ["compose", "up", "-d", "postgres", "redis"]);
    if (up.code !== 0) throw new Error(`docker compose up failed (code=${up.code})`);

    console.log("[smoke:full] Waiting for postgres...");
    await waitForPostgresReady();

    console.log("[smoke:full] Running migrations...");
    let lastMigCode = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const mig = await run("pnpm", ["run", "db:migrate"]);
      lastMigCode = mig.code;
      if (mig.code === 0) break;
      console.log(`[smoke:full] db:migrate failed (attempt ${attempt}/3), retrying...`);
      await sleep(1000);
    }
    if (lastMigCode !== 0) throw new Error(`db:migrate failed (code=${lastMigCode})`);

    console.log("[smoke:full] Starting worker (TWITTER_DRY_RUN=1)...");
    worker = startWorker();
    await Promise.race([
      worker.waitReady(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Worker start timeout")), 15000)
      ),
    ]);

    console.log("[smoke:full] Running end-to-end smoke...");
    const smoke = await run("pnpm", ["run", "smoke:e2e"]);
    if (smoke.code !== 0) throw new Error(`smoke:e2e failed (code=${smoke.code})`);

    console.log(
      JSON.stringify(
        { ok: true, durationMs: Date.now() - startedAt, mode: "TWITTER_DRY_RUN" },
        null,
        2
      )
    );
  } finally {
    if (worker) {
      console.log("[smoke:full] Stopping worker...");
      await worker.stop();
    }

    console.log("[smoke:full] Shutting down docker compose...");
    await run("docker", ["compose", "down"]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
