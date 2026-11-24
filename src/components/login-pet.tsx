import { useEffect, useRef } from "react";

interface LoginPetProps {
  /** "number" = eyes follow input length, "password" = eyes covered, "idle" = forward */
  mode: "number" | "password" | "idle";
  /** 0–10, used to shift gaze left→right as digits are typed */
  progress: number;
}

export function LoginPet({ mode, progress }: LoginPetProps) {
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (mode !== "number") return;
    // Map progress 0–10 to x offset -4..+4 and slight y dip
    const t = progress / 10; // 0..1
    const x = -4 + t * 8;
    const y = Math.sin(t * Math.PI) * 2; // slight arc

    [leftPupilRef, rightPupilRef].forEach((ref) => {
      if (ref.current) {
        ref.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
  }, [mode, progress]);

  useEffect(() => {
    if (mode === "idle") {
      [leftPupilRef, rightPupilRef].forEach((ref) => {
        if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
      });
    }
  }, [mode]);

  const coverEyes = mode === "password";

  return (
    <svg
      viewBox="0 0 120 120"
      width="110"
      height="110"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Body ── */}
      <ellipse cx="60" cy="78" rx="30" ry="34" fill="#f97316" />

      {/* ── Belly ── */}
      <ellipse cx="60" cy="84" rx="18" ry="22" fill="#fed7aa" />

      {/* ── Wings ── */}
      <ellipse cx="28" cy="82" rx="12" ry="20" fill="#ea580c" transform="rotate(-15 28 82)" />
      <ellipse cx="92" cy="82" rx="12" ry="20" fill="#ea580c" transform="rotate(15 92 82)" />

      {/* ── Head ── */}
      <circle cx="60" cy="48" r="28" fill="#f97316" />

      {/* ── Ear tufts ── */}
      <polygon points="40,24 34,8 46,20" fill="#ea580c" />
      <polygon points="80,24 86,8 74,20" fill="#ea580c" />

      {/* ── Eye whites ── */}
      <ellipse cx="47" cy="46" rx="11" ry="11" fill="white" />
      <ellipse cx="73" cy="46" rx="11" ry="11" fill="white" />

      {/* ── Pupils (animated) ── */}
      {!coverEyes && (
        <>
          <circle
            ref={leftPupilRef}
            cx="47" cy="46" r="6"
            fill="#1c1917"
            style={{ transition: "transform 0.15s ease-out" }}
          />
          <circle
            ref={rightPupilRef}
            cx="73" cy="46" r="6"
            fill="#1c1917"
            style={{ transition: "transform 0.15s ease-out" }}
          />
          {/* Eye shine */}
          <circle cx="50" cy="43" r="2" fill="white" style={{ pointerEvents: "none", transition: "transform 0.15s ease-out", transform: leftPupilRef.current?.style.transform }} />
          <circle cx="76" cy="43" r="2" fill="white" style={{ pointerEvents: "none", transition: "transform 0.15s ease-out", transform: rightPupilRef.current?.style.transform }} />
        </>
      )}

      {/* ── Covering paws (password mode) ── */}
      {coverEyes && (
        <>
          {/* left paw over left eye */}
          <ellipse cx="47" cy="46" rx="13" ry="11" fill="#ea580c"
            style={{ transition: "opacity 0.2s" }} />
          <ellipse cx="39" cy="52" rx="5" ry="4" fill="#fed7aa" />
          <ellipse cx="47" cy="55" rx="5" ry="4" fill="#fed7aa" />
          <ellipse cx="55" cy="52" rx="5" ry="4" fill="#fed7aa" />

          {/* right paw over right eye */}
          <ellipse cx="73" cy="46" rx="13" ry="11" fill="#ea580c"
            style={{ transition: "opacity 0.2s" }} />
          <ellipse cx="65" cy="52" rx="5" ry="4" fill="#fed7aa" />
          <ellipse cx="73" cy="55" rx="5" ry="4" fill="#fed7aa" />
          <ellipse cx="81" cy="52" rx="5" ry="4" fill="#fed7aa" />
        </>
      )}

      {/* ── Beak ── */}
      <polygon points="60,52 54,58 66,58" fill="#fb923c" />

      {/* ── Feet ── */}
      <ellipse cx="48" cy="109" rx="10" ry="5" fill="#ea580c" />
      <ellipse cx="72" cy="109" rx="10" ry="5" fill="#ea580c" />
    </svg>
  );
}
