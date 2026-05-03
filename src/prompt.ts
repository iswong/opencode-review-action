import * as github from "@actions/github";

export interface PRContext {
  title: string;
  body: string;
  diff: string;
  sha: string;
  repo: string;
  number: number;
}

export async function fetchPRContext(token: string): Promise<PRContext> {
  const ctx = github.context;
  const octokit = github.getOctokit(token);
  const prNumber = ctx.payload.pull_request?.number;

  if (!prNumber) {
    throw new Error("This action must be run in a pull_request context");
  }

  const { data: pr } = await octokit.rest.pulls.get({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    pull_number: prNumber,
  });

  const diffResponse = await octokit.rest.pulls.get({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });

  return {
    title: pr.title,
    body: pr.body ?? "",
    diff: diffResponse.data as unknown as string,
    sha: pr.head.sha,
    repo: `${ctx.repo.owner}/${ctx.repo.repo}`,
    number: pr.number,
  };
}

const COMMENT_FORMAT_RULES = `## Comment Format Rules

You MUST prefix every comment with one of these tiers:
- **Advisory:** — minor issues, style violations, or suggestions. Never causes build failure.
- **Severe:** — security vulnerabilities, broken idempotency, data-loss risk, or any issue that must be fixed before merge.
- **Silence** — if the code is clean, post nothing. Do not invent findings.

Use inline PR review comments on the specific file and line where the issue occurs.`;

export function buildPrompt(callerPrompt: string, ctx: PRContext): string {
  return `# Pull Request Review

## PR Metadata
- **Repository:** ${ctx.repo}
- **PR #:** ${ctx.number}
- **Title:** ${ctx.title}
- **SHA:** ${ctx.sha}

## PR Description
${ctx.body || "(no description)"}

## Diff
\`\`\`diff
${ctx.diff}
\`\`\`

---

${COMMENT_FORMAT_RULES}

---

## Review Instructions

${callerPrompt}`;
}
