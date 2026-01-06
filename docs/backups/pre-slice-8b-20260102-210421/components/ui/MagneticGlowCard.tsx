import React, { useRef } from "react";

type MagneticGlowCardProps = React.HTMLAttributes<HTMLDivElement>;

export const MagneticGlowCard: React.FC<MagneticGlowCardProps> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const tiltX = (y / rect.height) * -4;
    const tiltY = (x / rect.width) * 4;
    node.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
    node.style.boxShadow = "0 12px 40px -12px rgba(0,0,0,0.4), 0 0 24px -6px color-mix(in srgb, var(--accent-color) 35%, transparent)";
  };

  const onLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = "";
    node.style.boxShadow = "";
  };

  return (
    <div
      ref={ref}
      className={`card-primary card-padding-md hover-lift ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...props}
    >
      {children}
    </div>
  );
};
