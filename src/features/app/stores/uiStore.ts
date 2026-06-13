import { create } from "zustand";

type StateUpdate<T> = T | ((previous: T) => T);
type UiSetter<T> = (value: StateUpdate<T>) => void;

export interface UiState {
  collapsedGroups: Record<string, boolean>;
  search: string;
  isComposing: boolean;
  showTagFilter: boolean;
  selectedTagFilter: string | null;
  typeFilter: string | null;
  selectedIndex: number;
  isKeyboardMode: boolean;
  tagInput: string;
  editingTagsId: number | null;
  revealedIds: Set<number>;
}

interface UiActions {
  setCollapsedGroups: UiSetter<Record<string, boolean>>;
  setSearch: UiSetter<string>;
  setIsComposing: UiSetter<boolean>;
  setShowTagFilter: UiSetter<boolean>;
  setSelectedTagFilter: UiSetter<string | null>;
  setTypeFilter: UiSetter<string | null>;
  setSelectedIndex: UiSetter<number>;
  setIsKeyboardMode: UiSetter<boolean>;
  setTagInput: UiSetter<string>;
  setEditingTagsId: UiSetter<number | null>;
  setRevealedIds: UiSetter<Set<number>>;
  resetUi: () => void;
}

export type UiStore = UiState & UiActions;

export const createUiInitialState = (): UiState => ({
  collapsedGroups: {
    general: true,
    clipboard: true,
    advanced: true,
    appearance: true,
    default_apps: true,
    data: true
  },
  search: "",
  isComposing: false,
  showTagFilter: false,
  selectedTagFilter: null,
  typeFilter: null,
  selectedIndex: 0,
  isKeyboardMode: false,
  tagInput: "",
  editingTagsId: null,
  revealedIds: new Set()
});

const resolveUpdate = <T>(value: StateUpdate<T>, previous: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(previous) : value;

export const useUiStore = create<UiStore>((set) => ({
  ...createUiInitialState(),
  setCollapsedGroups: (value) => set((state) => ({ collapsedGroups: resolveUpdate(value, state.collapsedGroups) })),
  setSearch: (value) => set((state) => ({ search: resolveUpdate(value, state.search) })),
  setIsComposing: (value) => set((state) => ({ isComposing: resolveUpdate(value, state.isComposing) })),
  setShowTagFilter: (value) => set((state) => ({ showTagFilter: resolveUpdate(value, state.showTagFilter) })),
  setSelectedTagFilter: (value) => set((state) => ({ selectedTagFilter: resolveUpdate(value, state.selectedTagFilter) })),
  setTypeFilter: (value) => set((state) => ({ typeFilter: resolveUpdate(value, state.typeFilter) })),
  setSelectedIndex: (value) => set((state) => ({ selectedIndex: resolveUpdate(value, state.selectedIndex) })),
  setIsKeyboardMode: (value) => set((state) => ({ isKeyboardMode: resolveUpdate(value, state.isKeyboardMode) })),
  setTagInput: (value) => set((state) => ({ tagInput: resolveUpdate(value, state.tagInput) })),
  setEditingTagsId: (value) => set((state) => ({ editingTagsId: resolveUpdate(value, state.editingTagsId) })),
  setRevealedIds: (value) => set((state) => ({ revealedIds: resolveUpdate(value, state.revealedIds) })),
  resetUi: () => set(createUiInitialState())
}));

export const selectSearch = (state: UiStore) => state.search;
export const selectSelectedTagFilter = (state: UiStore) => state.selectedTagFilter;
export const selectTypeFilter = (state: UiStore) => state.typeFilter;
export const selectSelectedIndex = (state: UiStore) => state.selectedIndex;
export const selectIsKeyboardMode = (state: UiStore) => state.isKeyboardMode;
