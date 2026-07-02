import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  intense?: boolean;
  durationMs?: number;
  colors?: string[];
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; vrot: number;
  color: string;
  shape: 'chip' | 'strip' | 'coin';
  life: number;
}

const DEFAULT_COLORS = ['#fbbf24', '#ef4444', '#10b981', '#38bdf8', '#8b5cf6', '#ffffff'];

const Confetti: React.FC<ConfettiProps> = ({
  active, intense = false, durationMs = 4200, colors = DEFAULT_COLORS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = window.innerWidth;
    const count = intense ? 260 : 160;
    const shapes: Particle['shape'][] = ['chip', 'strip', 'coin'];
    particlesRef.current = Array.from({ length: count }, (): Particle => ({
      x: Math.random() * w,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 5,
      size: 6 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 1,
    }));
    startedAt.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startedAt.current;
      const done = elapsed >= durationMs;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        p.vy += 0.08;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (elapsed > durationMs * 0.6) {
          p.life = Math.max(0, p.life - 0.01);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.shape === 'strip') {
          ctx.fillRect(-p.size * 0.6, -p.size * 0.15, p.size * 1.2, p.size * 0.3);
        } else if (p.shape === 'coin') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      });

      if (!done) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, intense, durationMs, colors]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 200,
      }}
    />
  );
};

export default Confetti;
