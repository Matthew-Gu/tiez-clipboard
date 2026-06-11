import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { TAURI_EVENTS } from "../ipc/contracts";

interface UseWindowPinnedListenerOptions {
  onPinnedChange: (pinned: boolean) => void;
}

export const useWindowPinnedListener = ({ onPinnedChange }: UseWindowPinnedListenerOptions) => {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<boolean>(TAURI_EVENTS.windowPinnedChanged, (event) => {
          const pinned = event.payload === true;
          onPinnedChange(pinned);
        });
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [onPinnedChange]);
};
