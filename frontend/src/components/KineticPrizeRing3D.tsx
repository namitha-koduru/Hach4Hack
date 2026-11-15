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
  const velocityRef = useRef(0.008 * direction);
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
      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 136;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.48;
      const rx = w * 0.43;
      const ry = h * 0.21;

      // Central volumetric #d4ff33 core spotlight glow
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx * 0.85);
      glow.addColorStop(0, 'rgba(212, 255, 51, 0.45)');
      glow.addColorStop(0.42, 'rgba(212, 255, 51, 0.14)');
      glow.addColorStop(1, 'rgba(212, 255, 51, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.92, ry * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle inner pedestal disc stroke
      ctx.strokeStyle = 'rgba(212, 255, 51, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.54, ry * 0.54, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Project cylinder characters left-to-right across the front arc (depth > 0)
      const items = chars.map((char, idx) => {
        const theta = (idx / chars.length) * Math.PI * 2 - rotationRef.current;
        const depth = Math.sin(theta); // -1 back, +1 front
        // Negate cos(theta) so increasing idx moves LEFT (-rx) -> CENTER (0) -> RIGHT (+rx) when depth > 0
        const x = cx - Math.cos(theta) * rx;
        const y = cy + depth * ry;
        return { char, depth, x, y };
      });

      items.sort((a, b) => a.depth - b.depth);

      for (const item of items) {
        const isFront = item.depth >= 0;
        const frontFactor = (item.depth + 1) / 2; // 0..1

        // Keep back characters softly dimmed so front text is 100% readable without garbling
        const alpha = isFront ? 0.45 + item.depth * 0.55 : 0.06 + frontFactor * 0.12;
        const foreshorten = Math.max(0.28, Math.abs(item.depth) * 0.88 + 0.18);
        const fontSize = isFront ? Math.round(15 + item.depth * 5) : 13;

        if (isFront) {
          const streakHeight = 16 + item.depth * 22;
          const streakGrad = ctx.createLinearGradient(item.x, item.y + 6, item.x, item.y + streakHeight);
          streakGrad.addColorStop(0, `rgba(212, 255, 51, ${(alpha * 0.18).toFixed(3)})`);
          streakGrad.addColorStop(1, 'rgba(212, 255, 51, 0)');
          ctx.fillStyle = streakGrad;
          ctx.fillRect(item.x - 0.75, item.y + 8, 1.5, streakHeight);
        }

        ctx.save();
        ctx.translate(item.x, item.y);
        // Flip horizontal scale on back half so characters remain oriented like a translucent cylinder
        ctx.scale(isFront ? foreshorten : -foreshorten, 1);
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isFront
          ? item.depth > 0.4
            ? `rgba(245, 247, 242, ${alpha.toFixed(3)})`
            : `rgba(212, 255, 51, ${alpha.toFixed(3)})`
          : `rgba(156, 163, 150, ${alpha.toFixed(3)})`;
        ctx.fillText(item.char, 0, 0);
        ctx.restore();
      }

      ctx.restore();

      if (!prefersReducedMotion && !isDraggingRef.current) {
        const targetVel = (isHoveredRef.current ? 0.018 : 0.008) * direction;
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
    const delta = -dx * 0.012;
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
      className="w-full h-[136px] cursor-grab active:cursor-grabbing select-none touch-pan-y"
    />
  );
};
