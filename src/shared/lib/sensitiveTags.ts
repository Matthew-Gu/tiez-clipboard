export const BUILTIN_SENSITIVE_TAG_NAMES = ["sensitive", "password"] as const;

export const isSensitiveTag = (tag: string): boolean =>
  BUILTIN_SENSITIVE_TAG_NAMES.some((name) => name.toLowerCase() === tag.toLowerCase());

export const hasSensitiveTag = (tags?: string[]): boolean =>
  tags?.some(isSensitiveTag) ?? false;
