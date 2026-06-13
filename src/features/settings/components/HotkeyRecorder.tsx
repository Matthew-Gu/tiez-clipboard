import type { KeyboardEvent, ReactNode } from "react";

interface HotkeyRecorderProps {
  hotkey: string;
  isRecording: boolean;
  waitingLabel: string;
  renderHotkey: (hotkey: string) => ReactNode;
  setIsRecording: (isRecording: boolean) => void;
  updateHotkey: (hotkey: string) => void;
}

const HotkeyRecorder = ({
  hotkey,
  isRecording,
  waitingLabel,
  renderHotkey,
  setIsRecording,
  updateHotkey
}: HotkeyRecorderProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isRecording) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setIsRecording(false);
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      updateHotkey("");
      setIsRecording(false);
      return;
    }

    const modifiers = [];
    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.shiftKey) modifiers.push("Shift");
    if (event.altKey) modifiers.push("Alt");
    if (event.metaKey) modifiers.push("Command");

    const key = event.key.toUpperCase();
    if (["CONTROL", "SHIFT", "ALT", "META"].includes(key)) return;
    updateHotkey([...modifiers, key].join("+"));
  };

  return (
    <div
      className={`hotkey-recorder ${isRecording ? "hotkey-recorder--recording" : ""}`}
      onClick={(event) => {
        setIsRecording(true);
        event.currentTarget.focus();
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {isRecording
        ? <div className="hotkey-recorder__key" style={{ width: "8em" }}>{waitingLabel}</div>
        : renderHotkey(hotkey)}
    </div>
  );
};

export default HotkeyRecorder;
