import * as actionsExec from "@actions/exec";
import * as core from "@actions/core";
import * as os from "os";
import { spawn } from "child_process";
import { countReviewComments } from "./comments";
import { buildPrompt, fetchPRContext } from "./prompt";

export interface ReviewResult {
  severe: number;
  advisory: number;
}

const OPENCODE_PERMISSION = JSON.stringify({
  bash: {
    "*": "deny",
    "gh*": "allow",
    "gh pr review*": "deny",
  },
});

const OPENCODE_TIMEOUT_MS = 100_000;

async function installOpencode(): Promise<void> {
  await actionsExec.exec("npm", ["install", "-g", "opencode-ai"]);
}

async function spawnOpencode(
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<void> {
  const child = spawn("opencode", args, {
    ...options,
    stdio: "inherit",
  });

  const timeoutHandle = setTimeout(() => {
    const pid = child.pid;
    core.warning(
      `opencode exceeded ${OPENCODE_TIMEOUT_MS / 1000}s — interrupting PID ${pid}`,
    );
    // SIGUSR1 triggers the Node.js inspector which prints a stack snapshot to
    // stderr; give it a moment to flush before sending SIGINT to terminate.
    try {
      if (pid !== undefined) process.kill(pid, "SIGUSR1");
    } catch {
      // Already exited.
    }
    setTimeout(() => {
      try {
        if (pid !== undefined) process.kill(pid, "SIGINT");
      } catch {
        // Already exited.
      }
    }, 2_000);
  }, OPENCODE_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      if (code !== 0 && code !== null) {
        reject(new Error(`opencode exited with code ${code}`));
      } else {
        resolve();
      }
    });
    child.on("error", (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

export async function runReview(
  callerPrompt: string,
  model: string,
  apiKey: string,
  token: string,
): Promise<ReviewResult> {
  await installOpencode();

  const ctx = await fetchPRContext(token);
  const fullPrompt = buildPrompt(callerPrompt, ctx);

  // Run from a temp dir so opencode's file tool cannot read the checked-out
  // repo and cause the model to loop through every Ansible role file.
  // The full diff is already embedded in the prompt; gh API calls work fine
  // regardless of cwd as long as GH_TOKEN and GITHUB_REPOSITORY are set.
  await spawnOpencode(["run", "--verbose", "-m", model, fullPrompt], {
    cwd: os.tmpdir(),
    env: {
      ...process.env,
      OPENCODE_API_KEY: apiKey,
      OPENCODE_PERMISSION,
      GITHUB_TOKEN: token,
      GH_TOKEN: token,
      GITHUB_REPOSITORY: ctx.repo,
    },
  });

  return countReviewComments(token, ctx.number, ctx.sha);
}
