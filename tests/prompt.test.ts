import { describe, expect, it } from "vitest";
import { buildPrompt } from "../src/prompt";
import type { PRContext } from "../src/prompt";

const mockCtx: PRContext = {
  title: "Add new feature",
  body: "This PR adds a new feature",
  diff: "- old line\n+ new line",
  sha: "abc123def456",
  repo: "iswong/test-repo",
  number: 42,
};

describe("buildPrompt", () => {
  it("includes PR metadata", () => {
    const result = buildPrompt("Check for style issues", mockCtx);
    expect(result).toContain("iswong/test-repo");
    expect(result).toContain("42");
    expect(result).toContain("Add new feature");
    expect(result).toContain("abc123def456");
  });

  it("includes the diff", () => {
    const result = buildPrompt("Check for style issues", mockCtx);
    expect(result).toContain("- old line");
    expect(result).toContain("+ new line");
  });

  it("includes caller prompt", () => {
    const result = buildPrompt("Check for style issues", mockCtx);
    expect(result).toContain("Check for style issues");
  });

  it("includes comment format rules for both tiers", () => {
    const result = buildPrompt("Check for style issues", mockCtx);
    expect(result).toContain("Advisory:");
    expect(result).toContain("Severe:");
  });

  it("uses placeholder when body is empty", () => {
    const ctx = { ...mockCtx, body: "" };
    const result = buildPrompt("Check", ctx);
    expect(result).toContain("(no description)");
  });

  it("includes the PR body when present", () => {
    const result = buildPrompt("Check", mockCtx);
    expect(result).toContain("This PR adds a new feature");
  });
});
