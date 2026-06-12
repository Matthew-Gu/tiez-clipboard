import { describe, expect, it } from "vitest";
import { getTwoLevelBackAction, transitionTwoLevelPage } from "./twoLevelPage";

describe("two-level page navigation", () => {
  it("returns from a detail page to its list", () => {
    expect(getTwoLevelBackAction("detail")).toBe("show-list");
  });

  it("exits a section from its list page", () => {
    expect(getTwoLevelBackAction("list")).toBe("exit");
  });

  it("opens details after selecting or creating an item", () => {
    expect(transitionTwoLevelPage("list", "open-item")).toBe("detail");
  });

  it("returns to the list after deleting the current item", () => {
    expect(transitionTwoLevelPage("detail", "show-list")).toBe("list");
  });
});
