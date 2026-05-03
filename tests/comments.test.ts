import { describe, expect, it } from "vitest";
import { parseCommentCounts } from "../src/comments";
import type { ReviewComment } from "../src/comments";

const sha = "abc123def456";

describe("parseCommentCounts", () => {
  it("counts Severe: comments on matching SHA", () => {
    const comments: ReviewComment[] = [
      { body: "Severe: This is a security issue", commit_id: sha },
      { body: "Severe: Another problem", commit_id: sha },
    ];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(2);
    expect(result.advisory).toBe(0);
  });

  it("counts Advisory: comments on matching SHA", () => {
    const comments: ReviewComment[] = [{ body: "Advisory: Minor style issue", commit_id: sha }];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(0);
    expect(result.advisory).toBe(1);
  });

  it("counts both tiers independently", () => {
    const comments: ReviewComment[] = [
      { body: "Severe: Critical bug", commit_id: sha },
      { body: "Advisory: Nit", commit_id: sha },
      { body: "Advisory: Another nit", commit_id: sha },
    ];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(1);
    expect(result.advisory).toBe(2);
  });

  it("ignores comments with a different SHA", () => {
    const comments: ReviewComment[] = [{ body: "Severe: Critical bug", commit_id: "other-sha" }];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(0);
    expect(result.advisory).toBe(0);
  });

  it("ignores comments that match neither tier", () => {
    const comments: ReviewComment[] = [{ body: "LGTM!", commit_id: sha }];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(0);
    expect(result.advisory).toBe(0);
  });

  it("trims leading whitespace before matching tier prefix", () => {
    const comments: ReviewComment[] = [
      { body: "  Severe: With leading space", commit_id: sha },
      { body: "\tAdvisory: Tab indented", commit_id: sha },
    ];
    const result = parseCommentCounts(comments, sha);
    expect(result.severe).toBe(1);
    expect(result.advisory).toBe(1);
  });

  it("returns zero counts for empty comment list", () => {
    const result = parseCommentCounts([], sha);
    expect(result.severe).toBe(0);
    expect(result.advisory).toBe(0);
  });

  it("counts SEVERE: (uppercase) on matching SHA", () => {
    const comments: ReviewComment[] = [{ body: "SEVERE: all-caps tier", commit_id: sha }];
    expect(parseCommentCounts(comments, sha).severe).toBe(1);
  });

  it("counts severe: (lowercase) on matching SHA", () => {
    const comments: ReviewComment[] = [{ body: "severe: lower-case tier", commit_id: sha }];
    expect(parseCommentCounts(comments, sha).severe).toBe(1);
  });

  it("counts ADVISORY: (uppercase) on matching SHA", () => {
    const comments: ReviewComment[] = [{ body: "ADVISORY: all-caps advisory", commit_id: sha }];
    expect(parseCommentCounts(comments, sha).advisory).toBe(1);
  });

  it("counts advisory: (lowercase) on matching SHA", () => {
    const comments: ReviewComment[] = [{ body: "advisory: lower-case advisory", commit_id: sha }];
    expect(parseCommentCounts(comments, sha).advisory).toBe(1);
  });
});
