import { ReactNode } from "react";

interface NeonFrameProps {
  children: ReactNode;
  /** Toggle the animated scan line. Defaults to true. */
  scanning?: boolean;
  /** Extra classes for the wrapper */
  className?: string;
}

/**
 * Cyberpunk corner-bracket frame with optional scanning line.
 * Four corner L-shapes: ::before (top-left), ::after (top-right),
 * plus two inner <span> elements for bottom-left and bottom-right.
 */
export default function NeonFrame({
  children,
  scanning = true,
  className = "",
}: NeonFrameProps) {
  return (
    <div className={`neon-frame ${className}`}>
      {/* Bottom corners via inner spans */}
      <span className="neon-frame-corner-bl" />
      <span className="neon-frame-corner-br" />

      {/* Scanning line */}
      {scanning && <span className="neon-frame-scan" />}

      {/* Content */}
      {children}
    </div>
  );
}
