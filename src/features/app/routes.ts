import type { SettingsSubpage } from "./types";

export const MAIN_ROUTES = {
  home: "/",
  tags: "/tags",
  settings: "/settings",
  advancedSettings: "/settings/advanced"
} as const;

export interface MainRouteState {
  isKnownRoute: boolean;
  showSettings: boolean;
  settingsSubpage: SettingsSubpage;
  showTagManager: boolean;
}

export const getMainRouteState = (pathname: string): MainRouteState => ({
  isKnownRoute: Object.values(MAIN_ROUTES).includes(
    pathname as (typeof MAIN_ROUTES)[keyof typeof MAIN_ROUTES]
  ),
  showSettings:
    pathname === MAIN_ROUTES.settings || pathname === MAIN_ROUTES.advancedSettings,
  settingsSubpage: pathname === MAIN_ROUTES.advancedSettings ? "advanced" : "home",
  showTagManager: pathname === MAIN_ROUTES.tags
});
