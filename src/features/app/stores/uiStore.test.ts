import { beforeEach, describe, expect, it } from "vitest";
import {
  createUiInitialState,
  selectIsKeyboardMode,
  selectSearch,
  selectSelectedIndex,
  selectTypeFilter,
  useUiStore
} from "./uiStore";

describe("ui store", () => {
  beforeEach(() => {
    useUiStore.getState().resetUi();
  });

  it("matches the current shared UI defaults", () => {
    expect(useUiStore.getState()).toMatchObject(createUiInitialState());
  });

  it("supports direct and functional updates", () => {
    const store = useUiStore.getState();
    store.setSearch("tag:work");
    store.setSelectedIndex((previous) => previous + 2);
    store.setCollapsedGroups((previous) => ({ ...previous, general: false }));

    expect(useUiStore.getState()).toMatchObject({
      search: "tag:work",
      selectedIndex: 2,
      collapsedGroups: { general: false }
    });
  });

  it("resets values and creates fresh mutable containers", () => {
    const previousGroups = useUiStore.getState().collapsedGroups;
    const previousRevealedIds = useUiStore.getState().revealedIds;
    useUiStore.getState().setRevealedIds(new Set([1]));
    useUiStore.getState().resetUi();

    const state = useUiStore.getState();
    expect(state.revealedIds.size).toBe(0);
    expect(state.collapsedGroups).not.toBe(previousGroups);
    expect(state.revealedIds).not.toBe(previousRevealedIds);
  });

  it("exposes atomic selectors", () => {
    const state = useUiStore.getState();
    expect(selectSearch(state)).toBe("");
    expect(selectTypeFilter(state)).toBeNull();
    expect(selectSelectedIndex(state)).toBe(0);
    expect(selectIsKeyboardMode(state)).toBe(false);
  });

  it("excludes history, pagination, overlays, and preview lifecycle", () => {
    const state = useUiStore.getState() as unknown as Record<string, unknown>;
    expect(state).not.toHaveProperty("history");
    expect(state).not.toHaveProperty("currentOffset");
    expect(state).not.toHaveProperty("confirmDialog");
    expect(state).not.toHaveProperty("compactPreviewWindow");
  });
});
