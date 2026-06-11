import { describe, expect, it } from "vitest";
import {
  APP_SETTING_KEYS,
  TAURI_COMMANDS,
  TAURI_EVENTS,
  toAppSettingKey
} from "./contracts";
import type {
  ClipboardHistoryPageArgs,
  CopyToClipboardArgs,
  OpenContentArgs
} from "./contracts";

describe("tauri ipc contracts", () => {
  it("keeps key command and event names stable", () => {
    expect(TAURI_COMMANDS.getSettings).toBe("get_settings");
    expect(TAURI_COMMANDS.saveSetting).toBe("save_setting");
    expect(TAURI_COMMANDS.copyToClipboard).toBe("copy_to_clipboard");
    expect(TAURI_EVENTS.settingsChanged).toBe("settings-changed");
    expect(TAURI_EVENTS.clipboardChanged).toBe("clipboard-changed");
  });

  it("keeps app setting keys fully qualified", () => {
    expect(APP_SETTING_KEYS.theme).toBe("app.theme");
    expect(APP_SETTING_KEYS.soundPasteEnabled).toBe("app.sound_paste_enabled");
    expect(toAppSettingKey("theme")).toBe("app.theme");
    expect(Object.values(APP_SETTING_KEYS).every((key) => key.startsWith("app."))).toBe(true);
  });

  it("keeps critical argument field names stable", () => {
    const historyArgs = {
      limit: 50,
      direction: "older",
      cursorTimestamp: 1,
      cursorId: 2,
      contentType: "text",
      includePinned: true
    } satisfies ClipboardHistoryPageArgs;
    const copyArgs = {
      content: "",
      contentType: "text",
      paste: true,
      id: 1,
      deleteAfterUse: false,
      pasteWithFormat: false,
      moveToTop: true
    } satisfies CopyToClipboardArgs;
    const openArgs = {
      id: 1,
      content: "",
      contentType: "text"
    } satisfies OpenContentArgs;

    expect(Object.keys(historyArgs)).toEqual([
      "limit",
      "direction",
      "cursorTimestamp",
      "cursorId",
      "contentType",
      "includePinned"
    ]);
    expect(Object.keys(copyArgs)).toEqual([
      "content",
      "contentType",
      "paste",
      "id",
      "deleteAfterUse",
      "pasteWithFormat",
      "moveToTop"
    ]);
    expect(Object.keys(openArgs)).toEqual(["id", "content", "contentType"]);
  });
});
