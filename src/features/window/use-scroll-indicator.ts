import { useEffect, useMemo, useState } from "react";

export function createScrollIndicatorController(timeoutMs = 700) {
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    isVisible() {
      return visible;
    },
    onScroll() {
      visible = true;

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        visible = false;
      }, timeoutMs);
    },
    dispose() {
      if (timer) {
        clearTimeout(timer);
      }
      timer = null;
      visible = false;
    }
  };
}

export function useScrollIndicator(timeoutMs = 700) {
  const controller = useMemo(() => createScrollIndicatorController(timeoutMs), [timeoutMs]);
  const [visible, setVisible] = useState(false);

  useEffect(() => () => controller.dispose(), [controller]);

  return {
    visible,
    onScroll() {
      controller.onScroll();
      setVisible(controller.isVisible());

      setTimeout(() => {
        setVisible(controller.isVisible());
      }, timeoutMs);
    }
  };
}
