import { useEffect, useRef, useState } from "react";

interface LoginPetProps {
  mode: "number" | "password" | "idle";
  progress: number; // 0–10
}

const STYLES = `
@keyframes pet-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes pet-enter {
  0%   { transform: translateY(30px) scale(0.8); opacity: 0; }
  60%  { transform: translateY(-8px) scale(1.05); opacity: 1; }
  100% { transform: translateY(0px) scale(1); opacity: 1; }
}
@keyframes paws-up {
  0%   { transform: translateY(40px) scale(0.9); opacity: 0; }
  50%  { transform: translateY(-6px) scale(1.03); opacity: 1; }
  100% { transform: translateY(0px) scale(1); opacity: 1; }
}
@keyframes paws-down {
  0%   { transform: translateY(0px); opacity: 1; }
  100% { transform: translateY(40px) scale(0.9); opacity: 0; }
}
@keyframes pet-peek {
  0%,100% { transform: rotate(0deg); }
  25%      { transform: rotate(-3deg); }
  75%      { transform: rotate(3deg); }
}
`;

export function LoginPet({ mode, progress }: LoginPetProps) {
  const [prevMode, setPrevMode] = useState(mode);
  const [coverVisible, setCoverVisible] = useState(false);
  const [covering, setCovering] = useState(false);
  const [uncovering, setUncovering] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === prevMode) return;

    if (mode === "password") {
      setUncovering(false);
      setCoverVisible(true);
      setCovering(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else if (prevMode === "password") {
      setCovering(false);
      setUncovering(true);
      hideTimer.current = setTimeout(() => {
        setCoverVisible(false);
        setUncovering(false);
      }, 300);
    }

    setPrevMode(mode);
  }, [mode, prevMode]);

  // Head tilt follows typing progress
  const tilt = mode === "number" ? -8 + (progress / 10) * 16 : 0;

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ position: "relative", width: 180, height: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>

        {/* Open-eyes dog — always rendered, tilts on number input */}
        <img
          src="/login-dog.png"
          alt="Dog mascot"
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            animation: mode === "idle" ? "pet-float 3s ease-in-out infinite" : "none",
            transform: `rotate(${tilt}deg)`,
            transition: "transform 0.18s ease-out",
            opacity: coverVisible ? 0 : 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* Covered-eyes dog — fades in/out with bounce */}
        {coverVisible && (
          <img
            src="/login-dog-cover.png"
            alt=""
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              animation: covering
                ? "paws-up 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards"
                : uncovering
                  ? "paws-down 0.3s ease-in forwards"
                  : "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </>
  );
}
