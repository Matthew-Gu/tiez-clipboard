import {
  focusClipboardWindowCommand,
  restoreLastFocusCommand
} from "../ipc/commands";

export async function focusClipboardWindow(): Promise<void> {
  await focusClipboardWindowCommand();
}

export async function restoreLastFocus(): Promise<void> {
  await restoreLastFocusCommand();
}

export async function focusWindowImmediately(): Promise<void> {
  await focusClipboardWindow();
}

export async function restoreFocus(): Promise<void> {
  await restoreLastFocus();
}
