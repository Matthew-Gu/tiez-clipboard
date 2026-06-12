import { toTauriLocalImageSrc } from "../../../shared/lib/localImageSrc";

const RICH_IMAGE_FALLBACK_PREFIX = "<!--TIEZ_RICH_IMAGE:";
const RICH_IMAGE_FALLBACK_SUFFIX = "-->";
const TABULAR_RICH_HTML_RE = /<(table|tr|td|th|thead|tbody|tfoot|colgroup|col)\b/i;
const SPREADSHEET_SOURCE_RE = /\b(excel|et|wps|sheet|spreadsheet|calc)\b/i;
const SPREADSHEET_APP_RE = /(?:^|[\\/])(excel|et|wps|wpssheet|soffice)(?:\.exe|\.app)?$/i;
const STANDALONE_COLOR_RE = /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\(\s*[^)]+\s*\))$/i;

export const extractRichImageFallback = (html?: string): { cleanHtml?: string; imagePayload?: string } => {
  if (!html) return {};
  const start = html.lastIndexOf(RICH_IMAGE_FALLBACK_PREFIX);
  if (start < 0) return { cleanHtml: html };

  const markerStart = start + RICH_IMAGE_FALLBACK_PREFIX.length;
  const endRel = html.slice(markerStart).indexOf(RICH_IMAGE_FALLBACK_SUFFIX);
  if (endRel < 0) return { cleanHtml: html };

  const markerEnd = markerStart + endRel;
  const payload = html.slice(markerStart, markerEnd).trim();
  const cleanHtml = `${html.slice(0, start)}${html.slice(markerEnd + RICH_IMAGE_FALLBACK_SUFFIX.length)}`.trim();
  return {
    cleanHtml: cleanHtml || html,
    imagePayload: payload || undefined
  };
};

export const resolveRichImageSrc = (payload?: string): string | null => {
  if (!payload) return null;
  const value = payload.trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\/asset\.localhost\//i.test(value)) return value;
  return toTauriLocalImageSrc(value);
};

export const isAnimatedGifSrc = (src?: string | null): boolean => {
  const value = (src || "").trim().toLowerCase();
  if (!value) return false;
  return value.startsWith("data:image/gif") || /\.gif(?:$|[?#])/i.test(value);
};

export const richHtmlLooksTabular = (html?: string): boolean => {
  if (!html) return false;
  return TABULAR_RICH_HTML_RE.test(html);
};

export const isSpreadsheetLikeSource = (...candidates: Array<string | undefined>): boolean =>
  candidates.some((candidate) => {
    const value = (candidate || "").trim();
    if (!value) return false;
    return SPREADSHEET_APP_RE.test(value) || SPREADSHEET_SOURCE_RE.test(value);
  });

export const getStandaloneColorValue = (contentType: string, content: string): string | null => {
  if (contentType !== "text" && contentType !== "code") return null;
  const normalized = content.trim();
  if (!normalized || normalized.includes("\n")) return null;
  return STANDALONE_COLOR_RE.test(normalized) ? normalized : null;
};
