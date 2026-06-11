import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ClipboardEntrySummary } from "../types";
import { TAURI_EVENTS } from "../ipc/contracts";

interface UseClipboardEventsOptions {
  onUpdated: (entry: ClipboardEntrySummary) => void;
  onRemoved: (id: number) => void;
  onChanged?: () => void;
}

export const useClipboardEvents = ({ onUpdated, onRemoved, onChanged }: UseClipboardEventsOptions) => {
  const onUpdatedRef = useRef(onUpdated);
  const onRemovedRef = useRef(onRemoved);
  const onChangedRef = useRef(onChanged);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    onRemovedRef.current = onRemoved;
  }, [onRemoved]);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    const unlistenUpdate = listen<ClipboardEntrySummary>(TAURI_EVENTS.clipboardUpdated, (event) => {
      onUpdatedRef.current(event.payload);
    });
    const unlistenRemove = listen<number>(TAURI_EVENTS.clipboardRemoved, (event) => {
      onRemovedRef.current(event.payload);
    });
    const unlistenChanged = listen(TAURI_EVENTS.clipboardChanged, () => {
      onChangedRef.current?.();
    });

    return () => {
      unlistenUpdate.then((f) => f());
      unlistenRemove.then((f) => f());
      unlistenChanged.then((f) => f());
    };
  }, []);
};
