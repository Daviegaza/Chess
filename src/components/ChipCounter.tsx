import React, { useEffect, useRef, useState } from 'react';

interface ChipCounterProps {
  value: number;
  color?: string;
  size?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  weight?: number;
  style?: React.CSSProperties;
}

const ChipCounter: React.FC<ChipCounterProps> = ({
  value,
  color = '#fbbf24',
  size = 36,
  duration = 900,
  prefix = '',
  suffix = '',
  weight = 900,
  style,
}) => {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef<number>(value);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (display === value) return;
    fromRef.current = display;
    startRef.current = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span
      style={{
        color,
        fontSize: size,
        fontWeight: weight,
        fontFamily: "'Playfair Display', Georgia, serif",
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        ...style,
      }}
    >
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
};

export default ChipCounter;
