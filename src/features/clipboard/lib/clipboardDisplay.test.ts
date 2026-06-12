import { describe, expect, it } from "vitest";
import {
  extractRichImageFallback,
  getStandaloneColorValue,
  isAnimatedGifSrc,
  isSpreadsheetLikeSource,
  richHtmlLooksTabular
} from "./clipboardDisplay";

describe("clipboard display helpers", () => {
  it("extracts the final rich image fallback marker", () => {
    expect(extractRichImageFallback("<p>Hello</p><!--TIEZ_RICH_IMAGE: data:image/png;base64,abc -->")).toEqual({
      cleanHtml: "<p>Hello</p>",
      imagePayload: "data:image/png;base64,abc"
    });
  });

  it("keeps rich html unchanged when the marker is incomplete", () => {
    const html = "<p>Hello</p><!--TIEZ_RICH_IMAGE:broken";
    expect(extractRichImageFallback(html)).toEqual({ cleanHtml: html });
  });

  it("recognizes animated gif sources", () => {
    expect(isAnimatedGifSrc("data:image/gif;base64,abc")).toBe(true);
    expect(isAnimatedGifSrc("https://example.com/a.GIF?x=1")).toBe(true);
    expect(isAnimatedGifSrc("data:image/png;base64,abc")).toBe(false);
  });

  it("recognizes tabular html and spreadsheet sources", () => {
    expect(richHtmlLooksTabular("<table><tr><td>A</td></tr></table>")).toBe(true);
    expect(richHtmlLooksTabular("<p>A</p>")).toBe(false);
    expect(isSpreadsheetLikeSource("Microsoft Excel", "C:\\Office\\EXCEL.EXE")).toBe(true);
    expect(isSpreadsheetLikeSource("Notepad", "C:\\Windows\\notepad.exe")).toBe(false);
  });

  it("recognizes standalone text and code colors only", () => {
    expect(getStandaloneColorValue("text", " #fff ")).toBe("#fff");
    expect(getStandaloneColorValue("code", "rgba(1, 2, 3, 0.5)")).toBe("rgba(1, 2, 3, 0.5)");
    expect(getStandaloneColorValue("text", "#fff\nnext")).toBeNull();
    expect(getStandaloneColorValue("url", "#fff")).toBeNull();
  });
});
