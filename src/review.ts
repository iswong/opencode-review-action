import * as actionsExec from "@actions/exec";
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

export async function runReview(
  callerPrompt: string,
  model: string,
  apiKey: string,
  token: string,
): Promise<ReviewResult> {
  const ctx = await fetchPRContext(token);
  const fullPrompt = buildPrompt(callerPrompt, ctx);

  await actionsExec.exec("opencode", ["run", "-m", model, "--variant", "medium", fullPrompt], {
    env: {
      ...process.env,
      OPENCODE_API_KEY: apiKey,
      OPENCODE_PERMISSION,
    },
  });

  return countReviewComments(token, ctx.number, ctx.sha);
}
