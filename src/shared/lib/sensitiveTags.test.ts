import { describe, expect, it } from "vitest";
import {
  BUILTIN_SENSITIVE_TAG_NAMES,
  hasSensitiveTag,
  isSensitiveTag
} from "./sensitiveTags";

describe("sensitive tags", () => {
  it("includes every built-in sensitive tag", () => {
    expect(BUILTIN_SENSITIVE_TAG_NAMES).toEqual(["sensitive", "password"]);
  });

  it("matches built-in tags case-insensitively", () => {
    expect(isSensitiveTag("sensitive")).toBe(true);
    expect(isSensitiveTag("SENSITIVE")).toBe(true);
    expect(isSensitiveTag("password")).toBe(true);
    expect(isSensitiveTag("PASSWORD")).toBe(true);
    expect(isSensitiveTag("密码")).toBe(false);
  });

  it("does not match ordinary tags", () => {
    expect(isSensitiveTag("work")).toBe(false);
    expect(hasSensitiveTag(["work", "important"])).toBe(false);
  });

  it("detects a sensitive tag in a tag list", () => {
    expect(hasSensitiveTag(["work", "password"])).toBe(true);
    expect(hasSensitiveTag()).toBe(false);
  });
});
