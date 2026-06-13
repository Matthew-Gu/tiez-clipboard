export const TAG_COLOR_PRESETS = [
  "#4f7dff",
  "#6558f5",
  "#9b51e0",
  "#e0529c",
  "#e34d59",
  "#f28c28",
  "#e2b93b",
  "#27ae60",
  "#18a999",
  "#2d9cdb",
  "#607188",
  "#8b8b8b"
] as const;

export const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(prefixed) ? prefixed.toLowerCase() : null;
};

export const toggleSelectedItem = (selectedIds: Set<number>, id: number): Set<number> => {
  const next = new Set(selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

export const toggleAllSelectedItems = (selectedIds: Set<number>, itemIds: number[]): Set<number> =>
  itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id)) ? new Set() : new Set(itemIds);

export const createTagSearch = (tag: string): string => `tag:${tag}`;

export const getActiveTagSearch = (search: string): string | null =>
  search.toLowerCase().startsWith("tag:") ? search.slice(4) : null;
