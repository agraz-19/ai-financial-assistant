import { useEffect, useState } from "react";

export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 1200,
  formatter,
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const target = Number(value ?? 0);
    if (Number.isNaN(target)) {
      setCurrent(0);
      return;
    }

    let start = performance.now();
    const step = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      setCurrent(Math.round(target * progress));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
    return () => {
      setCurrent(target);
    };
  }, [value, duration]);

  const displayValue = formatter
    ? formatter(current)
    : current.toLocaleString("en-IN");

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
