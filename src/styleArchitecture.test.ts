import { describe, expect, it } from "vitest";

const styleFiles = import.meta.glob("./**/*.{less,css}", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;

const sourceFiles = import.meta.glob("./**/*.{ts,tsx}", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;

const genericStateSelector = /\.(active|selected|collapsed|dragging|recording|checked)(?![-_a-zA-Z0-9])/;
const genericRuntimeState = /classList\.(?:add|remove|toggle|contains)\(\s*["'](active|selected|collapsed|dragging|recording|checked)["']/;
const componentThemeOverride = /\.(?:theme-[a-z0-9-]+|dark-mode|light-mode)\b[^{,]*\s+\.[a-z]/;
const importantDeclaration = ["!", "important"].join("");

describe("style architecture", () => {
  it("uses Less without important declarations", () => {
    expect(Object.keys(styleFiles).filter((path) => path.endsWith(".css"))).toEqual([]);
    expect(Object.entries(styleFiles).filter(([, source]) => source.includes(importantDeclaration))).toEqual([]);
  });

  it("keeps one tag manager style entry", () => {
    const tagEntries = Object.keys(styleFiles).filter((path) => path.endsWith("/features/tag/styles/index.less"));
    const duplicateTagStyles = Object.keys(styleFiles).filter((path) => path.includes("/styles/components/tag-manager/"));

    expect(tagEntries).toHaveLength(1);
    expect(duplicateTagStyles).toEqual([]);
  });

  it("uses BEM modifiers instead of generic state classes", () => {
    expect(Object.entries(styleFiles).filter(([, source]) => genericStateSelector.test(source))).toEqual([]);
    expect(Object.entries(sourceFiles).filter(([, source]) => genericRuntimeState.test(source))).toEqual([]);
  });

  it("keeps theme styles token-only", () => {
    const themeFiles = Object.entries(styleFiles).filter(([path]) => path.includes("/styles/themes/"));
    expect(themeFiles.filter(([, source]) => componentThemeOverride.test(source))).toEqual([]);
  });
});
