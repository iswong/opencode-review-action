import * as core from "@actions/core";
import { runReview } from "./review";

async function run(): Promise<void> {
  const prompt = core.getInput("prompt", { required: true });
  const model = core.getInput("model") || "opencode/minimax-m2.5-free";
  const apiKey = core.getInput("api-key", { required: true });
  const mandatory = core.getInput("mandatory") === "true";
  const token = process.env.GITHUB_TOKEN ?? "";

  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const { severe, advisory } = await runReview(prompt, model, apiKey, token);

  core.setOutput("severe-count", String(severe));
  core.setOutput("advisory-count", String(advisory));

  if (mandatory && severe > 0) {
    core.setFailed(`AI review found ${severe} Severe issue(s)`);
  }
}

run().catch(core.setFailed);
