import { describe, expect, it, vi } from "vitest";
import { createScrollIndicatorController } from "./use-scroll-indicator";

describe("createScrollIndicatorController", () => {
  it("shows the indicator during scrolling and hides it after idle time", () => {
    vi.useFakeTimers();

    const controller = createScrollIndicatorController(700);
    controller.onScroll();

    expect(controller.isVisible()).toBe(true);

    vi.advanceTimersByTime(701);

    expect(controller.isVisible()).toBe(false);
    controller.dispose();
  });
});
