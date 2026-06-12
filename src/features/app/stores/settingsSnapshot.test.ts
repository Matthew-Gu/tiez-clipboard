import { describe, expect, it } from "vitest";
import { APP_SETTING_KEYS } from "../../../shared/ipc/contracts";
import { parseSettingsSnapshot } from "./settingsSnapshot";

describe("parseSettingsSnapshot", () => {
  it("preserves current defaults and boolean semantics", () => {
    const snapshot = parseSettingsSnapshot({});

    expect(snapshot).toMatchObject({
      hotkey: "Alt+C",
      colorMode: "system",
      language: "zh",
      persistent: true,
      showSearchBox: true,
      arrowKeySelection: true,
      quickPasteModifier: "disabled"
    });
  });

  it("normalizes values and clamps bounded numbers", () => {
    const snapshot = parseSettingsSnapshot({
      [APP_SETTING_KEYS.quickPasteModifier]: "Control",
      [APP_SETTING_KEYS.surfaceOpacity]: "120",
      [APP_SETTING_KEYS.sensitiveMaskPrefixVisible]: "-2",
      [APP_SETTING_KEYS.sensitiveMaskSuffixVisible]: "50",
      [APP_SETTING_KEYS.privacyProtectionKinds]: "phone, email, "
    });

    expect(snapshot).toMatchObject({
      quickPasteModifier: "ctrl",
      surfaceOpacity: 100,
      sensitiveMaskPrefixVisible: 0,
      sensitiveMaskSuffixVisible: 20,
      privacyProtectionKinds: ["phone", "email"]
    });
  });

  it("ignores invalid optional numbers and cleanup policies", () => {
    const snapshot = parseSettingsSnapshot({
      [APP_SETTING_KEYS.surfaceOpacity]: "not-a-number",
      [APP_SETTING_KEYS.appCleanupPolicies]: "{bad json"
    });

    expect(snapshot).not.toHaveProperty("surfaceOpacity");
    expect(snapshot).not.toHaveProperty("appCleanupPolicies");
  });
});
