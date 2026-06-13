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
const retiredTagTokens = /var\(--(?:accent-light|bg-main|border|radius-sm|radius-md|radius-lg|shadow|accent-color-dark)\)/;
const persistentStateModifier = /[a-z][a-z0-9-]*(?:__[a-z][a-z0-9-]*)?--(?:active|selected|checked|recording)/g;
const styledPersistentModifiers = new Set([
  "ui-button--active",
  "app-header__filter--active",
  "clipboard-item--selected",
  "clipboard-item__tag-suggestion--active",
  "hotkey-recorder--recording",
  "advanced-settings__target--active",
  "advanced-settings__capture-switch--active",
  "advanced-settings__action-tab--active",
  "settings-page__theme-choice--active",
  "settings-page__choice--active",
  "tag-manager__sort-button--active",
  "tag-manager__view-button--active",
  "tag-manager__card--selected",
  "tag-manager__selection-control--checked",
  "tag-manager__tag--active",
  "dialog__color-preset--active"
]);

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

  it("uses the in-app tag color picker", () => {
    const tagSources = Object.entries(sourceFiles).filter(([path]) => path.includes("/features/tag/"));
    expect(tagSources.filter(([, source]) => /type=["']color["']/.test(source))).toEqual([]);
  });

  it("does not use retired tag manager tokens", () => {
    const tagStyles = Object.entries(styleFiles).filter(([path]) => path.includes("/features/tag/styles/"));
    expect(tagStyles.filter(([, source]) => retiredTagTokens.test(source))).toEqual([]);
  });

  it("uses BEM modifiers instead of generic state classes", () => {
    expect(Object.entries(styleFiles).filter(([, source]) => genericStateSelector.test(source))).toEqual([]);
    expect(Object.entries(sourceFiles).filter(([, source]) => genericRuntimeState.test(source))).toEqual([]);
  });

  it("keeps theme styles token-only", () => {
    const themeFiles = Object.entries(styleFiles).filter(([path]) => path.includes("/styles/themes/"));
    expect(themeFiles.filter(([, source]) => componentThemeOverride.test(source))).toEqual([]);
  });

  it("defines every persistent state modifier used by React", () => {
    const usedModifiers = new Set(
      Object.values(sourceFiles).flatMap((source) => source.match(persistentStateModifier) ?? [])
    );
    expect([...usedModifiers].filter((modifier) => !styledPersistentModifiers.has(modifier))).toEqual([]);
  });

  it("keeps dialog foundations in the shared dialog stylesheet", () => {
    const duplicateDialogFoundations = Object.entries(styleFiles).filter(([path, source]) => (
      !path.endsWith("/styles/components/modal.less")
      && /\.(?:dialog-backdrop|dialog__button|dialog__title)\b/.test(source)
    ));

    expect(duplicateDialogFoundations).toEqual([]);
  });
});
