import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Okie Dokie logo is a circular seal: ring lettering, two stars, an inner
 * disc. A MOM is a record that gets stamped and sent to a client, so the seal
 * is reused here as the one signature element of the interface. It appears at
 * most once per screen — masthead, empty state, or document header.
 */
export function Seal({
  text = "MINUTES OF MEETING • OKIE DOKIE • ",
  className,
  children,
  ringOpacity = 1,
}: {
  text?: string;
  className?: string;
  children?: React.ReactNode;
  ringOpacity?: number;
}) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden="true"
      className={cn("h-24 w-24", className)}
    >
      <defs>
        <path
          id={`ring-${id}`}
          d="M 50,50 m 0,-39 a 39,39 0 1,1 0,78 a 39,39 0 1,1 0,-78"
          fill="none"
        />
      </defs>

      <g opacity={ringOpacity}>
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          opacity="0.5"
        />
        <text
          fill="currentColor"
          fontSize="7.2"
          fontWeight="700"
          letterSpacing="1.1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <textPath href={`#ring-${id}`} startOffset="0%">
            {text}
          </textPath>
        </text>
        {/* the two stars from the logo, at 9 and 3 o'clock */}
        <Star x={7.5} y={50} />
        <Star x={92.5} y={50} />
      </g>

      {children}
    </svg>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(0.11) translate(-25 -24)`}
      d="M25 0 L31 17 L49 17 L34.5 28 L40 46 L25 35 L10 46 L15.5 28 L1 17 L19 17 Z"
      fill="currentColor"
    />
  );
}
