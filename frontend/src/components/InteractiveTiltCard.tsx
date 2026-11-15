import React, { useRef, useState } from 'react';

interface InteractiveTiltCardProps {
  children: React.ReactNode;
  className?: string;
  baseRotateDeg?: number;
  maxTiltDeg?: number;
  glowColor?: string;
  onClick?: () => void;
}

export const InteractiveTiltCard: React.FC<InteractiveTiltCardProps> = ({
  children,
  className = '',
  baseRotateDeg = 0,
  maxTiltDeg = 9,
  glowColor = 'rgba(212, 255, 51, 0.16)',
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTilt((prev) => ({ ...prev, active: true }));
      return;
    }

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rx = (0.5 - y) * maxTiltDeg * 2;
    const ry = (x - 0.5) * maxTiltDeg * 2;

    setTilt({
      rx,
      ry,
      mx: Math.round(x * 100),
      my: Math.round(y * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  };

  const transformStyle = tilt.active
    ? `perspective(1100px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) rotateZ(0deg) translateY(-4px) scale3d(1.01, 1.01, 1.01)`
    : `perspective(1100px) rotateX(0deg) rotateY(0deg) rotateZ(${baseRotateDeg}deg) translateY(0px) scale3d(1, 1, 1)`;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: transformStyle,
        transition: tilt.active
          ? 'transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)'
          : 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Pointer-following radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(380px circle at ${tilt.mx}% ${tilt.my}%, ${glowColor}, transparent 72%)`,
        }}
      />

      {/* Crisp dynamic edge sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: tilt.active ? 1 : 0,
          boxShadow: 'inset 0 0 0 1px rgba(212, 255, 51, 0.34)',
        }}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
