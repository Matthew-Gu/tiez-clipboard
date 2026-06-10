import { describe, expect, it } from "vitest";
import type { ClipboardEntry, ClipboardEntrySummary } from "../types";
import {
  capHistoryWindow,
  mergeUniqueEntries,
  summaryToEntry,
  touchDetailLru
} from "./historyWindow";

const entry = (id: number): ClipboardEntry => ({
  id,
  content_type: "text",
  content: `${id}`,
  source_app: "test",
  timestamp: id,
  preview: `${id}`,
  is_pinned: false,
  tags: []
});

describe("history window", () => {
  it("keeps summaries lightweight when converted for the list", () => {
    const summary: ClipboardEntrySummary = {
      id: 1,
      contentType: "image",
      contentLength: 100_000,
      sourceApp: "test",
      timestamp: 1,
      preview: "[Image Content]",
      isPinned: false,
      tags: []
    };

    expect(summaryToEntry(summary).content).toBe("");
  });

  it("caps either side of the non-pinned window", () => {
    const items = Array.from({ length: 260 }, (_, index) => entry(index));

    expect(capHistoryWindow(items, "newest").items.map((item) => item.id)).toEqual(
      Array.from({ length: 240 }, (_, index) => index)
    );
    expect(capHistoryWindow(items, "oldest").items[0].id).toBe(20);
  });

  it("removes duplicate ids while preserving order", () => {
    expect(mergeUniqueEntries([entry(1), entry(2), entry(1)]).map((item) => item.id)).toEqual([
      1,
      2
    ]);
  });

  it("bounds the detail LRU and refreshes recently used ids", () => {
    let order: number[] = [];
    for (let id = 1; id <= 50; id++) {
      order = touchDetailLru(order, id, 48).order;
    }

    expect(order).toHaveLength(48);
    expect(order[0]).toBe(3);
    const refreshed = touchDetailLru(order, 3, 48).order;
    expect(refreshed[refreshed.length - 1]).toBe(3);
  });
});
