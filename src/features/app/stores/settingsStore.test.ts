import { beforeEach, describe, expect, it } from "vitest";
import {
  createSettingsInitialState,
  selectColorMode,
  selectLanguage,
  selectSettingsLoaded,
  selectTheme,
  useSettingsStore
} from "./settingsStore";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  it("matches the current settings defaults", () => {
    expect(useSettingsStore.getState()).toMatchObject(createSettingsInitialState());
  });

  it("supports direct and functional updates", () => {
    const store = useSettingsStore.getState();
    store.setTheme("paper");
    store.setPersistentLimit((previous) => previous + 200);
    store.setAppSettings((previous) => ({ ...previous, "app.theme": "paper" }));

    expect(useSettingsStore.getState()).toMatchObject({
      theme: "paper",
      persistentLimit: 1200,
      appSettings: { "app.theme": "paper" }
    });
  });

  it("resets values and creates fresh mutable containers", () => {
    const previousKinds = useSettingsStore.getState().privacyProtectionKinds;
    const previousApps = useSettingsStore.getState().installedApps;
    useSettingsStore.getState().setPrivacyProtectionKinds(["custom"]);
    useSettingsStore.getState().resetSettings();

    const state = useSettingsStore.getState();
    expect(state.privacyProtectionKinds).toEqual(["phone", "idcard", "email", "secret"]);
    expect(state.privacyProtectionKinds).not.toBe(previousKinds);
    expect(state.installedApps).not.toBe(previousApps);
  });

  it("exposes atomic selectors", () => {
    const state = useSettingsStore.getState();
    expect(selectSettingsLoaded(state)).toBe(false);
    expect(selectTheme(state)).toBe(createSettingsInitialState().theme);
    expect(selectColorMode(state)).toBe("system");
    expect(selectLanguage(state)).toBe("zh");
  });

  it("excludes transient UI, recording, and window objects", () => {
    const state = useSettingsStore.getState() as unknown as Record<string, unknown>;
    expect(state).not.toHaveProperty("showAppSelector");
    expect(state).not.toHaveProperty("isRecording");
    expect(state).not.toHaveProperty("window");
    expect(state).not.toHaveProperty("promise");
  });
});
