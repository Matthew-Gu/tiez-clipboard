import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { TAURI_EVENTS } from "../ipc/contracts";

interface UseToastListenerOptions {
  pushToast: (msg: string, duration?: number) => number;
}

export const useToastListener = ({ pushToast }: UseToastListenerOptions) => {
  useEffect(() => {
    const unlistenToast = listen<string>(TAURI_EVENTS.toast, (event) => {
      pushToast(event.payload, 3000);
    });
    return () => {
      unlistenToast.then((f) => f());
    };
  }, [pushToast]);
};
