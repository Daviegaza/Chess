import React, { useEffect, useRef } from 'react';

interface ParticleBurstProps {
  trigger: number;
  x: number;
  y: number;
  color?: string;
  count?: number;
}

interface P {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; vrot: number;
  life: number;
  color: string;
}

const PALETTE = ['#fbbf24', '#e2e8f0', '#ef4444', '#10b981', '#8b5cf6', '#fb7185'];

const ParticleBurst: React.FC<ParticleBurstProps> = ({
  trigger, x, y, color, count = 34,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<P[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    if (trigger < 0) return;

    const spawned: P[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      spawned.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        life: 1,
        color: color || PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    }
    particlesRef.current.push(...spawned);

    if (rafRef.current == null) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      const step = () => {
        ctx.clearRect(0, 0, w, h);
        const parts = particlesRef.current;
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.vy += 0.28;
          p.vx *= 0.985;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vrot;
          p.life -= 0.014;
          if (p.life <= 0 || p.y > h + 40) {
            parts.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.38, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
        if (parts.length > 0) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          ctx.clearRect(0, 0, w, h);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 150,
      }}
    />
  );
};

export default ParticleBurst;
