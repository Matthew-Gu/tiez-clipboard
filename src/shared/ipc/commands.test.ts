import { describe, expect, it, vi } from "vitest";
import { runSettingWrite } from "./commands";

describe("runSettingWrite", () => {
  it("notifies after a successful setting write", async () => {
    const write = vi.fn(async () => undefined);
    const notify = vi.fn(async () => undefined);

    await runSettingWrite(write, notify);

    expect(write).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
  });

  it("does not notify after a failed setting write", async () => {
    const error = new Error("save failed");
    const write = vi.fn(async () => {
      throw error;
    });
    const notify = vi.fn(async () => undefined);

    await expect(runSettingWrite(write, notify)).rejects.toBe(error);
    expect(notify).not.toHaveBeenCalled();
  });
});
