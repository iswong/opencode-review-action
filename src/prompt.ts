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

function buildCommentFormatRules(ctx: PRContext): string {
  return `## Comment Format Rules

You MUST prefix every comment with one of these tiers:
- **Advisory:** — minor issues, style violations, or suggestions. Never causes build failure.
- **Severe:** — security vulnerabilities, broken idempotency, data-loss risk, or any issue that must be fixed before merge.
- **Silence** — if the code is clean, post nothing. Do not invent findings.

Post inline review comments using this exact command for each finding (replace \`Advisory:\` with \`Severe:\` as appropriate):

\`\`\`sh
gh api \\
  --method POST \\
  -H "Accept: application/vnd.github+json" \\
  -H "X-GitHub-Api-Version: 2022-11-28" \\
  /repos/${ctx.repo}/pulls/${ctx.number}/comments \\
  -f "body=Advisory: <your comment here>" \\
  -f "commit_id=${ctx.sha}" \\
  -f "path=<file path>" \\
  -F "line=<line number>" \\
  -f "side=RIGHT"
\`\`\`

Hard rules:
- Do NOT run \`gh pr review\` (approve / request-changes / dismiss) — you are not authorised to change PR state.
- Do NOT post a comment if there is nothing to flag. Silence is the correct response when the code is clean.
- Do NOT praise the code or say "lgtm". Only comment when there is a real issue.`;
}

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

${buildCommentFormatRules(ctx)}

---

## Review Instructions

${callerPrompt}`;
}
