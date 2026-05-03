import * as github from "@actions/github";

export interface CommentCounts {
  severe: number;
  advisory: number;
}

export interface ReviewComment {
  body: string;
  commit_id: string;
}

export function parseCommentCounts(comments: ReviewComment[], sha: string): CommentCounts {
  let severe = 0;
  let advisory = 0;

  for (const comment of comments) {
    if (comment.commit_id !== sha) continue;
    const body = comment.body.trimStart().toLowerCase();
    if (body.startsWith("severe:")) severe++;
    else if (body.startsWith("advisory:")) advisory++;
  }

  return { severe, advisory };
}

export async function countReviewComments(token: string, prNumber: number, sha: string): Promise<CommentCounts> {
  const ctx = github.context;
  const octokit = github.getOctokit(token);

  const comments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    pull_number: prNumber,
  });

  return parseCommentCounts(comments, sha);
}
