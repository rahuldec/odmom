import { useEffect, useRef } from "react";

interface LoginPetProps {
  mode: "number" | "password" | "idle";
  progress: number; // 0–10
}

export function LoginPet({ mode, progress }: LoginPetProps) {
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);
  const leftShineRef = useRef<SVGCircleElement>(null);
  const rightShineRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (mode !== "number") return;
    const t = progress / 10;
    const x = -4 + t * 8;
    const y = Math.sin(t * Math.PI) * 1.5;
    const transform = `translate(${x}px, ${y}px)`;
    [leftPupilRef, rightPupilRef, leftShineRef, rightShineRef].forEach((ref) => {
      if (ref.current) ref.current.style.transform = transform;
    });
  }, [mode, progress]);

  useEffect(() => {
    if (mode === "idle") {
      [leftPupilRef, rightPupilRef, leftShineRef, rightShineRef].forEach((ref) => {
        if (ref.current) ref.current.style.transform = "translate(0px,0px)";
      });
    }
  }, [mode]);

  const coverEyes = mode === "password";

  return (
    <svg viewBox="0 0 120 130" width="110" height="120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

      {/* ── Floppy ears ── */}
      <ellipse cx="28" cy="38" rx="16" ry="26" fill="#c2763a" transform="rotate(-10 28 38)" />
      <ellipse cx="92" cy="38" rx="16" ry="26" fill="#c2763a" transform="rotate(10 92 38)" />
      {/* inner ear */}
      <ellipse cx="28" cy="40" rx="9" ry="18" fill="#e8a06a" transform="rotate(-10 28 40)" />
      <ellipse cx="92" cy="40" rx="9" ry="18" fill="#e8a06a" transform="rotate(10 92 40)" />

      {/* ── Head ── */}
      <ellipse cx="60" cy="52" rx="34" ry="32" fill="#d4884a" />

      {/* ── Snout ── */}
      <ellipse cx="60" cy="66" rx="18" ry="13" fill="#e8b07a" />

      {/* ── Eye whites ── */}
      <ellipse cx="45" cy="47" rx="11" ry="11" fill="white" />
      <ellipse cx="75" cy="47" rx="11" ry="11" fill="white" />

      {/* ── Pupils ── */}
      {!coverEyes && (
        <>
          <circle ref={leftPupilRef}  cx="45" cy="47" r="6.5" fill="#2d1a0e"
            style={{ transition: "transform 0.15s ease-out" }} />
          <circle ref={rightPupilRef} cx="75" cy="47" r="6.5" fill="#2d1a0e"
            style={{ transition: "transform 0.15s ease-out" }} />
          <circle ref={leftShineRef}  cx="47.5" cy="44.5" r="2" fill="white"
            style={{ transition: "transform 0.15s ease-out" }} />
          <circle ref={rightShineRef} cx="77.5" cy="44.5" r="2" fill="white"
            style={{ transition: "transform 0.15s ease-out" }} />
        </>
      )}

      {/* ── Paws covering eyes (password) ── */}
      {coverEyes && (
        <>
          {/* left paw */}
          <ellipse cx="45" cy="50" rx="13" ry="10" fill="#c2763a" />
          <ellipse cx="37" cy="57" rx="5.5" ry="4.5" fill="#d4884a" />
          <ellipse cx="45" cy="59" rx="5.5" ry="4.5" fill="#d4884a" />
          <ellipse cx="53" cy="57" rx="5.5" ry="4.5" fill="#d4884a" />
          {/* right paw */}
          <ellipse cx="75" cy="50" rx="13" ry="10" fill="#c2763a" />
          <ellipse cx="67" cy="57" rx="5.5" ry="4.5" fill="#d4884a" />
          <ellipse cx="75" cy="59" rx="5.5" ry="4.5" fill="#d4884a" />
          <ellipse cx="83" cy="57" rx="5.5" ry="4.5" fill="#d4884a" />
        </>
      )}

      {/* ── Nose ── */}
      <ellipse cx="60" cy="62" rx="7" ry="5" fill="#3d1f0a" />
      {/* nose shine */}
      <ellipse cx="58" cy="60.5" rx="2.5" ry="1.5" fill="#6b3a1f" opacity="0.6" />

      {/* ── Mouth ── */}
      <path d="M54,67 Q60,73 66,67" stroke="#3d1f0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* ── Tongue ── */}
      <ellipse cx="60" cy="72" rx="6" ry="5" fill="#f87171" />
      <line x1="60" y1="68" x2="60" y2="77" stroke="#f43f5e" strokeWidth="1" />

      {/* ── Body ── */}
      <ellipse cx="60" cy="104" rx="26" ry="22" fill="#d4884a" />
      {/* belly */}
      <ellipse cx="60" cy="108" rx="16" ry="14" fill="#e8b07a" />

      {/* ── Front paws ── */}
      <ellipse cx="40" cy="122" rx="10" ry="6" fill="#c2763a" />
      <ellipse cx="80" cy="122" rx="10" ry="6" fill="#c2763a" />

      {/* ── Tail (wagging hint) ── */}
      <path d="M84,96 Q100,82 96,70" stroke="#c2763a" strokeWidth="8" fill="none"
        strokeLinecap="round" />
      <circle cx="96" cy="70" r="5" fill="#c2763a" />

    </svg>
  );
}
