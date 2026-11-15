import React, { useEffect, useRef } from 'react';

interface KineticPrizeRing3DProps {
  ringText: string;
  direction?: 1 | -1;
}

export const KineticPrizeRing3D: React.FC<KineticPrizeRing3DProps> = ({
  ringText,
  direction = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0.011 * direction);
  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const lastXRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = ringText.split('');
    let rafId = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 340;
      const h = canvas.clientHeight || 130;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.44;
      const rx = w * 0.37;
      const ry = h * 0.2;

      // Central volumetric #d4ff33 core spotlight glow
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx * 0.85);
      glow.addColorStop(0, 'rgba(212, 255, 51, 0.55)');
      glow.addColorStop(0.42, 'rgba(212, 255, 51, 0.16)');
      glow.addColorStop(1, 'rgba(212, 255, 51, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.95, ry * 1.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle inner pedestal disc stroke
      ctx.strokeStyle = 'rgba(212, 255, 51, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.52, ry * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Project cylinder characters sorted back-to-front
      const items = chars.map((char, idx) => {
        const theta = (idx / chars.length) * Math.PI * 2 + rotationRef.current;
        const depth = Math.sin(theta); // -1 back, +1 front
        const x = cx + Math.cos(theta) * rx;
        const y = cy + depth * ry;
        return { char, depth, x, y, theta };
      });

      items.sort((a, b) => a.depth - b.depth);

      for (const item of items) {
        const frontFactor = (item.depth + 1) / 2; // 0..1
        const alpha = 0.14 + frontFactor * 0.86;
        const scaleX = Math.max(0.18, Math.abs(Math.sin(item.theta)) * 0.9 + 0.15);
        const fontSize = Math.round(14 + frontFactor * 8);

        // Vertical light streak below cylinder glyph
        const streakHeight = 20 + frontFactor * 26;
        const streakGrad = ctx.createLinearGradient(item.x, item.y, item.x, item.y + streakHeight);
        streakGrad.addColorStop(0, `rgba(245, 247, 242, ${(alpha * 0.25).toFixed(3)})`);
        streakGrad.addColorStop(1, 'rgba(212, 255, 51, 0)');
        ctx.fillStyle = streakGrad;
        ctx.fillRect(item.x - 1, item.y + 4, 2, streakHeight);

        // Render glyph
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.scale(scaleX, 1);
        ctx.font = `800 ${fontSize}px "Syne", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle =
          item.depth > 0.35
            ? `rgba(245, 247, 242, ${alpha.toFixed(3)})`
            : `rgba(156, 163, 150, ${alpha.toFixed(3)})`;
        ctx.fillText(item.char, 0, 0);
        ctx.restore();
      }

      ctx.restore();

      if (!prefersReducedMotion && !isDraggingRef.current) {
        const targetVel = (isHoveredRef.current ? 0.026 : 0.011) * direction;
        velocityRef.current += (targetVel - velocityRef.current) * 0.06;
        rotationRef.current += velocityRef.current;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [ringText, direction]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    const delta = dx * 0.012;
    rotationRef.current += delta;
    velocityRef.current = delta;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        isDraggingRef.current = false;
      }}
      title="Drag horizontally to spin pedestal ring"
      className="w-full h-[132px] cursor-grab active:cursor-grabbing select-none touch-pan-y"
    />
  );
};
