import { describe, expect, it } from "vitest";
import { getMainRouteState, MAIN_ROUTES } from "./routes";

describe("main window routes", () => {
  it("keeps the fixed main window paths stable", () => {
    expect(MAIN_ROUTES).toEqual({
      home: "/",
      tags: "/tags",
      settings: "/settings",
      advancedSettings: "/settings/advanced"
    });
  });

  it("derives page state from settings routes", () => {
    expect(getMainRouteState(MAIN_ROUTES.settings)).toMatchObject({
      isKnownRoute: true,
      showSettings: true,
      settingsSubpage: "home",
      showTagManager: false
    });
    expect(getMainRouteState(MAIN_ROUTES.advancedSettings)).toMatchObject({
      isKnownRoute: true,
      showSettings: true,
      settingsSubpage: "advanced",
      showTagManager: false
    });
  });

  it("derives tag manager state and rejects unknown paths", () => {
    expect(getMainRouteState(MAIN_ROUTES.tags)).toMatchObject({
      isKnownRoute: true,
      showSettings: false,
      showTagManager: true
    });
    expect(getMainRouteState("/unknown")).toMatchObject({
      isKnownRoute: false,
      showSettings: false,
      showTagManager: false
    });
  });
});
