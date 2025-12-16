import React, { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  format = (n) => n.toLocaleString("en-US"),
}) => {
  const [display, setDisplay] = useState(value);
  const start = useRef(0);
  const from = useRef(value);

  useEffect(() => {
    from.current = display;
    start.current = performance.now();
    let raf: number;
    const step = (ts: number) => {
      const progress = clamp((ts - start.current) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from.current + (value - from.current) * eased;
      setDisplay(next);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className="text-numeric">
      {prefix}
      {format(display)}
      {suffix}
    </span>
  );
};
