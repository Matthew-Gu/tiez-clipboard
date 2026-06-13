import { describe, expect, it } from "vitest";
import {
  createTagSearch,
  getActiveTagSearch,
  normalizeHexColor,
  toggleAllSelectedItems,
  toggleSelectedItem
} from "./tagManagerUi";

describe("tag manager ui helpers", () => {
  it("normalizes valid six-digit and eight-digit hex colors", () => {
    expect(normalizeHexColor("AABBCC")).toBe("#aabbcc");
    expect(normalizeHexColor("#4f7dff")).toBe("#4f7dff");
    expect(normalizeHexColor("AABBCC80")).toBe("#aabbcc80");
    expect(normalizeHexColor("#4f7dffcc")).toBe("#4f7dffcc");
    expect(normalizeHexColor("#fff")).toBeNull();
    expect(normalizeHexColor("#ffff")).toBeNull();
    expect(normalizeHexColor("invalid")).toBeNull();
  });

  it("toggles one or all selected items", () => {
    expect([...toggleSelectedItem(new Set([1]), 2)]).toEqual([1, 2]);
    expect([...toggleSelectedItem(new Set([1, 2]), 1)]).toEqual([2]);
    expect([...toggleAllSelectedItems(new Set(), [1, 2])]).toEqual([1, 2]);
    expect([...toggleAllSelectedItems(new Set([1, 2]), [1, 2])]).toEqual([]);
    expect([...toggleAllSelectedItems(new Set([3, 4]), [1, 2])]).toEqual([1, 2]);
  });

  it("creates and reads tag search expressions", () => {
    expect(createTagSearch("work")).toBe("tag:work");
    expect(getActiveTagSearch("tag:work")).toBe("work");
    expect(getActiveTagSearch("hello")).toBeNull();
  });
});
