export type TwoLevelPage = "list" | "detail";
export type TwoLevelPageEvent = "open-item" | "show-list";

export const getTwoLevelBackAction = (page: TwoLevelPage): "show-list" | "exit" =>
  page === "detail" ? "show-list" : "exit";

export const transitionTwoLevelPage = (
  _page: TwoLevelPage,
  event: TwoLevelPageEvent
): TwoLevelPage => event === "open-item" ? "detail" : "list";
