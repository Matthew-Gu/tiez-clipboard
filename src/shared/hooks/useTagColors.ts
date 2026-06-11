import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TAURI_EVENTS } from "../ipc/contracts";

export const useTagColors = () => {
  const [tagColors, setTagColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTagColors = () => {
      invoke<Record<string, string>>("get_tag_colors")
        .then(setTagColors)
        .catch(console.error);
    };

    fetchTagColors();
    const unlistenColors = listen(TAURI_EVENTS.tagColorsUpdated, fetchTagColors);

    return () => {
      unlistenColors.then((f) => f());
    };
  }, []);

  return tagColors;
};
