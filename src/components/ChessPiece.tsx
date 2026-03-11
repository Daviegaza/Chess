import React, { useEffect, useRef } from 'react';
import { Piece, PieceType } from '../types/chess.types';

// ─── Color Palettes ──────────────────────────────────────────────────────────

interface Pal {
  hi: string;   // specular hotspot
  lit: string;  // lit surface
  mid: string;  // mid tone
  shd: string;  // shadow
  drk: string;  // deep shadow
  spec: string; // specular overlay rgba
  rimlit: string;
}

const W: Pal = {
  hi:    '#fffde6',
  lit:   '#f4df80',
  mid:   '#d4a030',
  shd:   '#8a5518',
  drk:   '#3a2208',
  spec:  'rgba(255,253,220,0.88)',
  rimlit:'rgba(255,230,120,0.22)',
};
const B: Pal = {
  hi:    '#7a4e28',
  lit:   '#3e2212',
  mid:   '#1e1008',
  shd:   '#0c0703',
  drk:   '#040302',
  spec:  'rgba(200,140,55,0.55)',
  rimlit:'rgba(110,65,20,0.20)',
};

// ─── Gradient Factories ───────────────────────────────────────────────────────

function sphereGrad(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  p: Pal
): CanvasGradient {
  const lx = cx - r * 0.38;
  const ly = cy - r * 0.42;
  const g = ctx.createRadialGradient(lx, ly, r * 0.04, cx, cy, r * 1.05);
  g.addColorStop(0.00, p.hi);
  g.addColorStop(0.16, p.lit);
  g.addColorStop(0.44, p.mid);
  g.addColorStop(0.72, p.shd);
  g.addColorStop(1.00, p.drk);
  return g;
}

function bodyGrad(
  ctx: CanvasRenderingContext2D,
  left: number, right: number,
  p: Pal
): CanvasGradient {
  const g = ctx.createLinearGradient(left, 0, right, 0);
  g.addColorStop(0.00, p.drk);
  g.addColorStop(0.10, p.shd);
  g.addColorStop(0.24, p.hi);
  g.addColorStop(0.44, p.lit);
  g.addColorStop(0.62, p.mid);
  g.addColorStop(0.82, p.shd);
  g.addColorStop(1.00, p.drk);
  return g;
}

function capGrad(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number,
  p: Pal, bright = false
): CanvasGradient {
  const g = ctx.createRadialGradient(cx - rx * 0.28, cy - rx * 0.18, rx * 0.04, cx, cy, rx);
  g.addColorStop(0.00, bright ? p.hi  : p.lit);
  g.addColorStop(0.45, bright ? p.lit : p.mid);
  g.addColorStop(1.00, p.shd);
  return g;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function shadow(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.52, cy = s * 0.905;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.30);
  g.addColorStop(0.00, 'rgba(0,0,0,0.60)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  g.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.30, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Draw a cylinder segment with elliptical caps */
function cyl(
  ctx: CanvasRenderingContext2D,
  cx: number,
  ty: number, trx: number,  // top y, top rx
  by: number, brx: number,  // bottom y, bottom rx
  p: Pal,
  ery?: number               // optional override for ellipse ry (default proportional)
) {
  const bry = ery ?? brx * 0.22;
  const try_ = ery != null ? ery * (trx / brx) : trx * 0.22;

  // Body sides
  ctx.beginPath();
  ctx.moveTo(cx - trx, ty);
  ctx.lineTo(cx - brx, by);
  ctx.lineTo(cx + brx, by);
  ctx.lineTo(cx + trx, ty);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, cx - brx, cx + brx, p);
  ctx.fill();

  // Bottom cap
  ctx.beginPath();
  ctx.ellipse(cx, by, brx, bry, 0, 0, Math.PI * 2);
  ctx.fillStyle = capGrad(ctx, cx, by, brx, p);
  ctx.fill();

  // Top cap
  ctx.beginPath();
  ctx.ellipse(cx, ty, trx, try_, 0, 0, Math.PI * 2);
  ctx.fillStyle = capGrad(ctx, cx, ty, trx, p, true);
  ctx.fill();
}

/** Draw a sphere (with gradient + specular) */
function sphere(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  p: Pal
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sphereGrad(ctx, cx, cy, r, p);
  ctx.fill();

  // Specular
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.30, cy - r * 0.35, r * 0.30, r * 0.22, -0.45, 0, Math.PI * 2);
  ctx.fillStyle = p.spec;
  ctx.fill();
  ctx.restore();
}

/** Thin ring/collar */
function ring(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, h: number,
  p: Pal
) {
  cyl(ctx, cx, cy - h * 0.5, rx, cy + h * 0.5, rx * 1.08, p);
}

// ─── Piece Drawing ─────────────────────────────────────────────────────────────

function drawPawn(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;
  // Wide base
  cyl(ctx, cx, s*0.730, s*0.210, s*0.840, s*0.275, p);
  // Waist body
  cyl(ctx, cx, s*0.640, s*0.140, s*0.730, s*0.175, p);
  // Collar ring
  ring(ctx, cx, s*0.628, s*0.155, s*0.048, p);
  // Neck
  cyl(ctx, cx, s*0.532, s*0.100, s*0.640, s*0.120, p);
  // Head sphere
  sphere(ctx, cx, s*0.390, s*0.185, p);
}

function drawRook(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;
  // Base
  cyl(ctx, cx, s*0.720, s*0.225, s*0.840, s*0.285, p);
  // Body column
  cyl(ctx, cx, s*0.360, s*0.180, s*0.720, s*0.210, p);
  // Top platform (wider)
  cyl(ctx, cx, s*0.285, s*0.225, s*0.360, s*0.200, p);

  // Three merlons (battlements)
  const mw = s * 0.118;
  const mh = s * 0.130;
  const gapW = s * 0.060;
  const totalW = 3 * mw + 2 * gapW;
  const mStartX = cx - totalW / 2;
  const topY = s * 0.160;
  const botY = s * 0.285;

  for (let i = 0; i < 3; i++) {
    const mx = mStartX + i * (mw + gapW);
    const mcx = mx + mw / 2;
    // Merlon body
    ctx.beginPath();
    ctx.moveTo(mx, botY);
    ctx.lineTo(mx, topY + s*0.022);
    ctx.lineTo(mx + mw, topY + s*0.022);
    ctx.lineTo(mx + mw, botY);
    ctx.closePath();
    ctx.fillStyle = bodyGrad(ctx, mx, mx + mw, p);
    ctx.fill();
    // Top cap
    ctx.beginPath();
    ctx.ellipse(mcx, topY + s*0.022, mw/2, mw*0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = capGrad(ctx, mcx, topY, mw/2, p, true);
    ctx.fill();
    // Rim glow
    ctx.beginPath();
    ctx.ellipse(mcx, topY + s*0.022, mw/2, mw*0.14, 0, 0, Math.PI * 2);
    ctx.strokeStyle = p.rimlit;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawBishop(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;
  // Base
  cyl(ctx, cx, s*0.720, s*0.215, s*0.840, s*0.275, p);
  // Lower body
  cyl(ctx, cx, s*0.530, s*0.155, s*0.720, s*0.200, p);
  // Collar ring
  ring(ctx, cx, s*0.520, s*0.170, s*0.046, p);
  // Upper taper
  cyl(ctx, cx, s*0.370, s*0.100, s*0.530, s*0.140, p);
  // Collar ring 2
  ring(ctx, cx, s*0.360, s*0.112, s*0.038, p);
  // Orb
  sphere(ctx, cx, s*0.280, s*0.118, p);
  // Thin neck to tip
  cyl(ctx, cx, s*0.138, s*0.030, s*0.278, s*0.042, p);
  // Tip ball
  sphere(ctx, cx, s*0.118, s*0.038, p);

  // Bishop notch (horizontal cut across orb)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, s*0.280, s*0.118, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(cx - s*0.12, s*0.274);
  ctx.lineTo(cx + s*0.12, s*0.274);
  ctx.lineWidth = s * 0.022;
  ctx.strokeStyle = p.drk;
  ctx.stroke();
  ctx.restore();
}

function drawKnight(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;

  // Base
  cyl(ctx, cx, s*0.720, s*0.215, s*0.840, s*0.275, p);
  // Neck plinth
  cyl(ctx, cx, s*0.580, s*0.160, s*0.720, s*0.200, p);

  // ── Horse head silhouette path ────────────────────────────────────────────
  // Face right (+x direction)
  const hp = (x: number, y: number): [number, number] => [x * s, y * s];

  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(...hp(0.298, 0.580));             // neck left base
    ctx.bezierCurveTo(...hp(0.260, 0.540), ...hp(0.248, 0.490), ...hp(0.268, 0.440)); // neck left up
    ctx.bezierCurveTo(...hp(0.262, 0.400), ...hp(0.270, 0.340), ...hp(0.300, 0.290)); // back of neck
    ctx.bezierCurveTo(...hp(0.288, 0.254), ...hp(0.310, 0.206), ...hp(0.358, 0.180)); // back skull
    ctx.bezierCurveTo(...hp(0.350, 0.140), ...hp(0.380, 0.118), ...hp(0.410, 0.138)); // ear tip
    ctx.bezierCurveTo(...hp(0.440, 0.118), ...hp(0.475, 0.128), ...hp(0.488, 0.162)); // top skull  
    ctx.bezierCurveTo(...hp(0.530, 0.165), ...hp(0.580, 0.185), ...hp(0.615, 0.228)); // forehead/snout top
    ctx.bezierCurveTo(...hp(0.648, 0.265), ...hp(0.660, 0.315), ...hp(0.652, 0.358)); // snout  
    ctx.bezierCurveTo(...hp(0.680, 0.375), ...hp(0.690, 0.398), ...hp(0.676, 0.422)); // nose bump
    ctx.bezierCurveTo(...hp(0.670, 0.445), ...hp(0.648, 0.455), ...hp(0.620, 0.448)); // underside nose
    ctx.bezierCurveTo(...hp(0.598, 0.465), ...hp(0.568, 0.478), ...hp(0.548, 0.498)); // chin area
    ctx.bezierCurveTo(...hp(0.555, 0.525), ...hp(0.565, 0.550), ...hp(0.558, 0.580)); // chest right  
    ctx.lineTo(...hp(0.298, 0.580));             // close at base
    ctx.closePath();
  };

  // Fill horse head with body gradient
  headPath();
  ctx.fillStyle = bodyGrad(ctx, s * 0.248, s * 0.690, p);
  ctx.fill();

  // Specular highlight on head
  ctx.save();
  headPath();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(s*0.365, s*0.310, s*0.075, s*0.110, -0.45, 0, Math.PI * 2);
  ctx.fillStyle = p.spec;
  ctx.fill();
  // Mane stripe
  ctx.beginPath();
  ctx.moveTo(s*0.300, s*0.290);
  ctx.bezierCurveTo(s*0.290, s*0.350, s*0.292, s*0.410, s*0.310, s*0.450);
  ctx.strokeStyle = p.hi;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = s * 0.022;
  ctx.stroke();
  ctx.restore();

  // Eye
  const eyeX = s * 0.470, eyeY = s * 0.228, eyeR = s * 0.026;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = p.drk;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeX - eyeR*0.28, eyeY - eyeR*0.28, eyeR * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  // Nostril
  ctx.beginPath();
  ctx.ellipse(s*0.648, s*0.408, s*0.018, s*0.012, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = p.drk;
  ctx.fill();
}

function drawQueen(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;
  // Base
  cyl(ctx, cx, s*0.720, s*0.215, s*0.840, s*0.280, p);
  // Lower body
  cyl(ctx, cx, s*0.560, s*0.160, s*0.720, s*0.205, p);
  // Collar
  ring(ctx, cx, s*0.548, s*0.178, s*0.048, p);
  // Upper body (taper)
  cyl(ctx, cx, s*0.380, s*0.118, s*0.560, s*0.152, p);
  // Crown base ring
  ring(ctx, cx, s*0.366, s*0.132, s*0.038, p);

  // Crown - 5 orbs at different heights
  const crownOrbs = [
    { x: cx,            y: s*0.258, r: s*0.052 }, // center - tallest
    { x: cx - s*0.110,  y: s*0.276, r: s*0.042 }, // left 1
    { x: cx + s*0.110,  y: s*0.276, r: s*0.042 }, // right 1
    { x: cx - s*0.195,  y: s*0.300, r: s*0.036 }, // left 2
    { x: cx + s*0.195,  y: s*0.300, r: s*0.036 }, // right 2
  ];

  // Crown connectors
  crownOrbs.forEach(orb => {
    ctx.beginPath();
    ctx.moveTo(orb.x - orb.r * 0.5, s * 0.364);
    ctx.lineTo(orb.x + orb.r * 0.5, s * 0.364);
    ctx.lineTo(orb.x + orb.r * 0.4, orb.y + orb.r);
    ctx.lineTo(orb.x - orb.r * 0.4, orb.y + orb.r);
    ctx.closePath();
    ctx.fillStyle = bodyGrad(ctx, orb.x - orb.r, orb.x + orb.r, p);
    ctx.fill();
  });

  crownOrbs.forEach(orb => sphere(ctx, orb.x, orb.y, orb.r, p));
}

function drawKing(ctx: CanvasRenderingContext2D, s: number, p: Pal) {
  shadow(ctx, s);
  const cx = s * 0.5;
  // Base
  cyl(ctx, cx, s*0.720, s*0.218, s*0.840, s*0.282, p);
  // Body (taller than queen)
  cyl(ctx, cx, s*0.530, s*0.160, s*0.720, s*0.208, p);
  // Collar
  ring(ctx, cx, s*0.518, s*0.178, s*0.050, p);
  // Upper body
  cyl(ctx, cx, s*0.360, s*0.120, s*0.530, s*0.155, p);
  // Crown band
  cyl(ctx, cx, s*0.310, s*0.150, s*0.360, s*0.135, p);

  // Cross atop the crown ──────────────────────────────────────────────────────
  const crossW = s * 0.050;
  const crossH = s * 0.170;
  const crossArmW = s * 0.130;
  const crossArmH = s * 0.046;
  const crossTopY = s * 0.140;
  const crossCX = cx;

  const drawCrossBar = (x: number, y: number, w: number, h: number) => {
    const rx_ = w / 2;
    // Vertical/horizontal rect
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = bodyGrad(ctx, x, x + w, p);
    ctx.fill();
    // Top cap
    ctx.beginPath();
    ctx.ellipse(x + rx_, y, rx_, rx_ * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = capGrad(ctx, x + rx_, y, rx_, p, true);
    ctx.fill();
  };

  // Vertical bar
  drawCrossBar(crossCX - crossW / 2, crossTopY, crossW, crossH);
  // Horizontal arm
  drawCrossBar(crossCX - crossArmW / 2, crossTopY + crossH * 0.30, crossArmW, crossArmH);

  // Cross ball tips
  sphere(ctx, crossCX, crossTopY, crossW * 0.72, p);
  sphere(ctx, crossCX - crossArmW / 2, crossTopY + crossH * 0.30 + crossArmH * 0.5, crossArmH * 0.65, p);
  sphere(ctx, crossCX + crossArmW / 2, crossTopY + crossH * 0.30 + crossArmH * 0.5, crossArmH * 0.65, p);
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

function drawPiece(
  ctx: CanvasRenderingContext2D,
  s: number,
  type: PieceType,
  isWhite: boolean
) {
  const pal = isWhite ? W : B;
  ctx.clearRect(0, 0, s, s);

  switch (type) {
    case 'pawn':   drawPawn(ctx, s, pal);   break;
    case 'rook':   drawRook(ctx, s, pal);   break;
    case 'bishop': drawBishop(ctx, s, pal); break;
    case 'knight': drawKnight(ctx, s, pal); break;
    case 'queen':  drawQueen(ctx, s, pal);  break;
    case 'king':   drawKing(ctx, s, pal);   break;
  }
}

// ─── React Component ─────────────────────────────────────────────────────────

interface ChessPieceProps {
  piece: Piece;
  size?: number;
}

const ChessPiece: React.FC<ChessPieceProps> = ({ piece, size = 72 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    drawPiece(ctx, size, piece.type, piece.color === 'white');
  }, [piece.type, piece.color, size]);

  return (
    <canvas
      ref={ref}
      style={{
        width: size,
        height: size,
        display: 'block',
        pointerEvents: 'none',
        imageRendering: 'crisp-edges',
      }}
      aria-label={`${piece.color} ${piece.type}`}
    />
  );
};

export default ChessPiece;
