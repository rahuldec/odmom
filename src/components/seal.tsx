import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Okie Dokie logo is a circular seal: ring lettering, two stars, an inner
 * disc. A MOM is a record that gets stamped and sent to a client, so the seal
 * is reused here as the one signature element of the interface. It appears at
 * most once per screen — masthead, empty state, or document header.
 *
 * The ring text sits on two arcs, not one. A single full-circle textPath puts
 * the bottom half upside down; a real seal reverses the lower arc so both
 * halves read left to right. Pass empty strings for a plain ring.
 */
export function Seal({
  topText = "MINUTES OF MEETING",
  bottomText = "OKIE DOKIE",
  className,
  children,
}: {
  topText?: string;
  bottomText?: string;
  className?: string;
  children?: React.ReactNode;
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
        <path id={`top-${id}`} d="M 12,50 A 38,38 0 0 1 88,50" fill="none" />
        <path id={`bot-${id}`} d="M 5,50 A 45,45 0 0 0 95,50" fill="none" />
      </defs>

      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle
        cx="50"
        cy="50"
        r="31"
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
        textAnchor="middle"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <textPath href={`#top-${id}`} startOffset="50%">
          {topText}
        </textPath>
      </text>

      <text
        fill="currentColor"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="1.1"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <textPath href={`#bot-${id}`} startOffset="50%">
          {bottomText}
        </textPath>
      </text>

      <Star x={9} y={50} />
      <Star x={91} y={50} />

      {children}
    </svg>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(0.1) translate(-25 -24)`}
      d="M25 0 L31 17 L49 17 L34.5 28 L40 46 L25 35 L10 46 L15.5 28 L1 17 L19 17 Z"
      fill="currentColor"
    />
  );
}
