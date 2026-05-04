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
    diff: String(diffResponse.data),
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

## Posting Comments — CRITICAL REQUIREMENT

For each issue found, you MUST post it by EXECUTING this bash command via your bash tool.
DO NOT write the command as text output. DO NOT put it in a code block. EXECUTE IT NOW using your bash tool.

gh api --method POST -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/${ctx.repo}/pulls/${ctx.number}/comments -f "body=Advisory: <replace with your comment>" -f "commit_id=${ctx.sha}" -f "path=<replace with file path>" -F "line=<replace with line number>" -f "side=RIGHT"

Replace "Advisory:" with "Severe:" for severe issues.
Substitute <replace with your comment>, <replace with file path>, and <replace with line number> with actual values.

You have permission to run gh commands. Run the command above immediately for each finding — do not defer, summarise, or print.

Hard rules:
- The diff above is complete — do NOT run \`gh pr diff\` to fetch more context.
- You MAY read specific files from the repository (using cat, grep, find, etc.) to check whether a change is consistent with the existing codebase. Focus only on files directly relevant to the diff.
- Do NOT recursively scan large directory trees or read files unrelated to the changed code.
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
