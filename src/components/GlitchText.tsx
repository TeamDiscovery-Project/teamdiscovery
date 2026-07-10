import React from "react";

interface GlitchTextProps {
  children: React.ReactNode;
  className?: string;
  colorA?: string;
  colorB?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

/**
 * GlitchText — renders text with a cyberpunk glitch-slice effect on hover.
 * Uses CSS pseudo-elements driven by data-text and --glitch-color-* custom properties.
 */
export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  className = "",
  colorA,
  colorB,
  as: Tag = "span",
}) => {
  const style: React.CSSProperties = {};
  if (colorA) style["--glitch-color-a" as string] = colorA;
  if (colorB) style["--glitch-color-b" as string] = colorB;

  return (
    <Tag
      className={`glitch-text ${className}`}
      data-text={typeof children === "string" ? children : undefined}
      style={style}
    >
      {children}
    </Tag>
  );
};
