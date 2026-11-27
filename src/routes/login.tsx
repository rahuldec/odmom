import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { Seal } from "@/components/seal";
import logoUrl from "../logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendLoginOtp, verifyLoginOtp, loginWithPassword } from "@/lib/erp-auth.functions";
import { setSession, getSession } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in | Okie Dokie MOM Portal" },
      { name: "description", content: "Sign in to Okie Dokie's Client Visit MOM Portal." },
      { property: "og:title", content: "Sign in | Okie Dokie MOM Portal" },
      { property: "og:description", content: "Sign in to Okie Dokie's Client Visit MOM Portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getSession()) {
      throw { redirect: { to: "/" } };
    }
  },
  component: LoginPage,
});

type Mode = "otp" | "password";
type OtpStep = "mobile" | "otp";

// ── Dog mascot ────────────────────────────────────────────────────────────────
function DogMascot({ eyesCovered, peeking, pending }: { eyesCovered: boolean; peeking: boolean; pending: boolean }) {
  const common = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    transition: "opacity 0.3s ease",
  };

  const styles = `
    @keyframes dogSway {
      0%,100% { transform: rotate(-1.5deg) translateX(-1px); }
      50%      { transform: rotate( 1.5deg) translateX( 1px); }
    }
    @keyframes tailWag {
      0%,100% { transform: rotate(-28deg); }
      50%      { transform: rotate( 28deg); }
    }
    @keyframes earBounceL {
      0%,42%,46%,50%,100% { transform: rotate(-18deg) translateY(0px); }
      44%,48% { transform: rotate(-18deg) translateY(-5px); }
    }
    @keyframes earBounceR {
      0%,52%,56%,60%,100% { transform: rotate(18deg) translateY(0px); }
      54%,58% { transform: rotate(18deg) translateY(-5px); }
    }
    @keyframes eyeBlink {
      0%,90%,100% { transform: scaleY(1); }
      92%,98%     { transform: scaleY(0.08); }
    }
    @keyframes tongueWag {
      0%,100% { transform: rotate(-6deg); }
      50%     { transform: rotate( 6deg); }
    }
    @keyframes blushPulse {
      0%,100% { opacity: 0.38; }
      50%     { opacity: 0.55; }
    }
    .dm-body  { transform-origin: 85px 160px; animation: dogSway 3.2s ease-in-out infinite; }
    .dm-earL  { transform-box: view-box; transform-origin: 36px 68px; animation: earBounceL 4.8s ease-in-out infinite; }
    .dm-earR  { transform-box: view-box; transform-origin: 134px 68px; animation: earBounceR 4.8s ease-in-out infinite; }
    .dm-eyeL  { transform-box: fill-box; transform-origin: 50% 50%; animation: eyeBlink 5s ease-in-out infinite; }
    .dm-eyeR  { transform-box: fill-box; transform-origin: 50% 50%; animation: eyeBlink 5s ease-in-out infinite 0.1s; }
    .dm-tongue{ transform-box: view-box; transform-origin: 85px 115px; animation: tongueWag 1.3s ease-in-out infinite; }
    .dm-blushL{ animation: blushPulse 2s ease-in-out infinite; }
    .dm-blushR{ animation: blushPulse 2s ease-in-out infinite 1s; }
    .dm-tail  { transform-box: view-box; transform-origin: 132px 158px; animation: tailWag 0.52s ease-in-out infinite; }
  `;

  return (
    <div style={{ position: "relative", width: 190, height: 200 }}>
      {/* ── Normal: eyes open + all animations ── */}
      <svg viewBox="0 0 190 200" style={{ ...common, opacity: eyesCovered && !peeking ? 0 : 1 }} xmlns="http://www.w3.org/2000/svg">
        <style>{styles}</style>

        {/* Tail (behind body) */}
        <g className="dm-tail">
          <path d="M137 160 Q158 148 165 132 Q170 118 160 112" stroke="#CF8220" strokeWidth="11" fill="none" strokeLinecap="round"/>
          <path d="M137 160 Q158 148 165 132 Q170 118 160 112" stroke="#E8A030" strokeWidth="7"  fill="none" strokeLinecap="round"/>
        </g>

        {/* Body group (sways) */}
        <g className="dm-body">
          {/* Body */}
          <ellipse cx="95" cy="175" rx="52" ry="36" fill="#E8A030"/>
          {/* Body shading */}
          <ellipse cx="95" cy="178" rx="34" ry="32" fill="#F5EDE0"/>
          <ellipse cx="85" cy="183" rx="22" ry="18" fill="#EDE5D8" opacity="0.5"/>
          {/* Neck shading */}
          <ellipse cx="95" cy="143" rx="22" ry="12" fill="#D4901A" opacity="0.35"/>

          {/* Left ear */}
          <g className="dm-earL">
            <ellipse cx="46" cy="72" rx="20" ry="31" fill="#CF8220"/>
            <ellipse cx="46" cy="72" rx="12" ry="21" fill="#F0C0A0"/>
            {/* Inner ear crease */}
            <ellipse cx="46" cy="76" rx="6" ry="12" fill="#E8B090" opacity="0.5"/>
          </g>

          {/* Right ear */}
          <g className="dm-earR">
            <ellipse cx="144" cy="72" rx="20" ry="31" fill="#CF8220"/>
            <ellipse cx="144" cy="72" rx="12" ry="21" fill="#F0C0A0"/>
            <ellipse cx="144" cy="76" rx="6" ry="12" fill="#E8B090" opacity="0.5"/>
          </g>

          {/* Head */}
          <ellipse cx="95" cy="88" rx="56" ry="54" fill="#E8A030"/>
          {/* Head fur shading sides */}
          <ellipse cx="50"  cy="90" rx="18" ry="30" fill="#CF8220" opacity="0.28"/>
          <ellipse cx="140" cy="90" rx="18" ry="30" fill="#CF8220" opacity="0.28"/>
          {/* Forehead diamond patch */}
          <path d="M95 44 L107 60 L95 76 L83 60 Z" fill="#F5EDE0" opacity="0.95"/>
          {/* Forehead soft blend */}
          <ellipse cx="95" cy="62" rx="16" ry="14" fill="#F5EDE0" opacity="0.6"/>

          {/* Eyebrows */}
          <path d="M62 70 Q70 65 78 70" stroke="#8B5E20" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M112 70 Q120 65 128 70" stroke="#8B5E20" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

          {/* Eye whites */}
          <ellipse className="dm-eyeL" cx="72"  cy="85" rx="14" ry="15" fill="white"/>
          <ellipse className="dm-eyeR" cx="118" cy="85" rx="14" ry="15" fill="white"/>
          {/* Pupils */}
          <circle cx="74"  cy="87" r="10" fill="#120A02"/>
          <circle cx="116" cy="87" r="10" fill="#120A02"/>
          {/* Eye shines large */}
          <circle cx="78"  cy="83" r="3.5" fill="white"/>
          <circle cx="120" cy="83" r="3.5" fill="white"/>
          {/* Eye shines small */}
          <circle cx="71"  cy="91" r="1.5" fill="white" opacity="0.6"/>
          <circle cx="113" cy="91" r="1.5" fill="white" opacity="0.6"/>

          {/* Whisker dots left */}
          <circle cx="52" cy="100" r="2" fill="#8B5E20" opacity="0.55"/>
          <circle cx="52" cy="107" r="2" fill="#8B5E20" opacity="0.55"/>
          <circle cx="52" cy="114" r="2" fill="#8B5E20" opacity="0.55"/>
          {/* Whisker dots right */}
          <circle cx="138" cy="100" r="2" fill="#8B5E20" opacity="0.55"/>
          <circle cx="138" cy="107" r="2" fill="#8B5E20" opacity="0.55"/>
          <circle cx="138" cy="114" r="2" fill="#8B5E20" opacity="0.55"/>

          {/* Blush */}
          <ellipse className="dm-blushL" cx="56"  cy="99" rx="11" ry="7" fill="#F09090" opacity="0.38"/>
          <ellipse className="dm-blushR" cx="134" cy="99" rx="11" ry="7" fill="#F09090" opacity="0.38"/>

          {/* Nose */}
          <ellipse cx="95" cy="107" rx="9" ry="6.5" fill="#1E0E04"/>
          {/* Nose ridge highlight */}
          <line x1="95" y1="102" x2="95" y2="110" stroke="#3A1A08" strokeWidth="1.2" opacity="0.4"/>
          <circle cx="92" cy="104" r="2.2" fill="white" opacity="0.4"/>

          {/* Mouth */}
          <path d="M82 115 Q95 126 108 115" stroke="#1E0E04" strokeWidth="1.6" fill="none" strokeLinecap="round"/>

          {/* Tongue (wagging) */}
          <g className="dm-tongue">
            <ellipse cx="95" cy="124" rx="9" ry="7" fill="#E05070"/>
            <line x1="95" y1="117" x2="95" y2="131" stroke="#C03055" strokeWidth="1.4"/>
          </g>

          {/* Left arm */}
          <ellipse cx="43"  cy="165" rx="18" ry="26" fill="#E8A030"/>
          <ellipse cx="43"  cy="185" rx="16" ry="10" fill="#CF8220"/>
          <ellipse cx="35"  cy="183" rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="43"  cy="180" rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="51"  cy="183" rx="5" ry="3.5" fill="#B87018"/>
          {/* Right arm */}
          <ellipse cx="147" cy="165" rx="18" ry="26" fill="#E8A030"/>
          <ellipse cx="147" cy="185" rx="16" ry="10" fill="#CF8220"/>
          <ellipse cx="139" cy="183" rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="147" cy="180" rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="155" cy="183" rx="5" ry="3.5" fill="#B87018"/>
        </g>
      </svg>

      {/* ── Eyes covered: paws up ── */}
      <svg viewBox="0 0 190 200" style={{ ...common, opacity: eyesCovered && !peeking ? 1 : 0 }} xmlns="http://www.w3.org/2000/svg">
        <style>{`
          @keyframes dogSway2 {
            0%,100% { transform: rotate(-1deg) translateX(-1px); }
            50%      { transform: rotate( 1deg) translateX( 1px); }
          }
          .dm2-body { transform-origin: 95px 160px; animation: dogSway2 3.2s ease-in-out infinite; }
          .dm2-blushL { animation: blushPulse 2s ease-in-out infinite; }
          .dm2-blushR { animation: blushPulse 2s ease-in-out infinite 1s; }
          @keyframes blushPulse { 0%,100%{opacity:0.38}50%{opacity:0.6} }
        `}</style>

        {/* Tail */}
        <g className="dm-tail" style={{transformBox:"view-box",transformOrigin:"132px 158px", animation:"tailWag 0.52s ease-in-out infinite"}}>
          <path d="M137 160 Q158 148 165 132 Q170 118 160 112" stroke="#CF8220" strokeWidth="11" fill="none" strokeLinecap="round"/>
          <path d="M137 160 Q158 148 165 132 Q170 118 160 112" stroke="#E8A030" strokeWidth="7"  fill="none" strokeLinecap="round"/>
        </g>

        <g className="dm2-body">
          {/* Body */}
          <ellipse cx="95" cy="175" rx="52" ry="36" fill="#E8A030"/>
          <ellipse cx="95" cy="178" rx="34" ry="32" fill="#F5EDE0"/>
          <ellipse cx="85" cy="183" rx="22" ry="18" fill="#EDE5D8" opacity="0.5"/>
          <ellipse cx="95" cy="143" rx="22" ry="12" fill="#D4901A" opacity="0.35"/>

          {/* Left ear */}
          <ellipse cx="46" cy="72" rx="20" ry="31" fill="#CF8220" transform="rotate(-18 46 72)"/>
          <ellipse cx="46" cy="72" rx="12" ry="21" fill="#F0C0A0" transform="rotate(-18 46 72)"/>
          {/* Right ear */}
          <ellipse cx="144" cy="72" rx="20" ry="31" fill="#CF8220" transform="rotate(18 144 72)"/>
          <ellipse cx="144" cy="72" rx="12" ry="21" fill="#F0C0A0" transform="rotate(18 144 72)"/>

          {/* Head */}
          <ellipse cx="95" cy="88" rx="56" ry="54" fill="#E8A030"/>
          <ellipse cx="50"  cy="90" rx="18" ry="30" fill="#CF8220" opacity="0.28"/>
          <ellipse cx="140" cy="90" rx="18" ry="30" fill="#CF8220" opacity="0.28"/>
          <path d="M95 44 L107 60 L95 76 L83 60 Z" fill="#F5EDE0" opacity="0.95"/>
          <ellipse cx="95" cy="62" rx="16" ry="14" fill="#F5EDE0" opacity="0.6"/>

          {/* Worried eyebrows */}
          <path d="M64 68 Q72 61 80 66" stroke="#8B5E20" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M110 66 Q118 61 126 68" stroke="#8B5E20" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

          {/* Blush stronger (embarrassed) */}
          <ellipse className="dm2-blushL" cx="56"  cy="99" rx="13" ry="9" fill="#F06060" opacity="0.38"/>
          <ellipse className="dm2-blushR" cx="134" cy="99" rx="13" ry="9" fill="#F06060" opacity="0.38"/>

          {/* Nose */}
          <ellipse cx="95" cy="107" rx="9" ry="6.5" fill="#1E0E04"/>
          <circle cx="92" cy="104" r="2.2" fill="white" opacity="0.4"/>

          {/* Squiggly embarrassed mouth */}
          <path d="M82 118 Q88 113 95 118 Q102 123 108 118" stroke="#1E0E04" strokeWidth="1.6" fill="none" strokeLinecap="round"/>

          {/* Left arm raised to cover left eye */}
          <ellipse cx="58" cy="105" rx="20" ry="16" fill="#E8A030" transform="rotate(-42 58 105)"/>
          <ellipse cx="45" cy="90"  rx="19" ry="13" fill="#CF8220"/>
          <ellipse cx="36" cy="86"  rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="45" cy="83"  rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="54" cy="86"  rx="5" ry="3.5" fill="#B87018"/>

          {/* Right arm raised to cover right eye */}
          <ellipse cx="132" cy="105" rx="20" ry="16" fill="#E8A030" transform="rotate(42 132 105)"/>
          <ellipse cx="145" cy="90"  rx="19" ry="13" fill="#CF8220"/>
          <ellipse cx="136" cy="86"  rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="145" cy="83"  rx="5" ry="3.5" fill="#B87018"/>
          <ellipse cx="154" cy="86"  rx="5" ry="3.5" fill="#B87018"/>
        </g>
      </svg>
      {peeking && (
        <svg viewBox="0 0 190 200" style={common} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M48 154c4-18 11-42 19-59 4-8 14-10 20-5 5 4 6 11 3 17l-11 27c-3 8-2 17 0 25Z" fill="#E8A030" />
          <ellipse cx="72" cy="86" rx="17" ry="13" fill="#CF8220" />
          <ellipse cx="61" cy="83" rx="4.5" ry="3" fill="#B87018" />
          <ellipse cx="69" cy="79" rx="4.5" ry="3" fill="#B87018" />
          <ellipse cx="77" cy="79" rx="4.5" ry="3" fill="#B87018" />
          <ellipse cx="84" cy="83" rx="4.5" ry="3" fill="#B87018" />
        </svg>
      )}
      {pending && (
        <div className="login-wait-bubble" aria-hidden="true">
          <span className="login-wait-dot" />
          <span className="login-wait-dot" />
          <span className="login-wait-dot" />
        </div>
      )}
    </div>
  );
}

// ── Landscape background ──────────────────────────────────────────────────────
function LandscapeBackground() {
  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: "38%", pointerEvents: "none", zIndex: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Far hill */}
      <path d="M0,160 Q180,100 360,140 Q540,180 720,120 Q900,60 1080,120 Q1260,180 1440,140 L1440,320 L0,320 Z" fill="#B8D860" />
      {/* Mid hill */}
      <path d="M0,205 Q200,155 400,185 Q600,215 800,170 Q1000,125 1200,175 Q1350,210 1440,185 L1440,320 L0,320 Z" fill="#72BC3C" />
      {/* Front hill */}
      <path d="M0,248 Q220,205 440,232 Q660,260 880,220 Q1100,180 1300,228 Q1390,252 1440,238 L1440,320 L0,320 Z" fill="#50A828" />
      {/* Ground */}
      <rect x="0" y="268" width="1440" height="52" fill="#3E9218" />

      {/* ── Fence ── */}
      {[80,160,240,320,400,480,560,640,720,800,880,960,1040,1120,1200,1280,1360].map((x) => (
        <g key={x}>
          {/* Post */}
          <rect x={x - 5} y={215} width={10} height={55} rx="2" fill="#8B5E3C" />
          {/* Pointed top */}
          <polygon points={`${x - 5},215 ${x + 5},215 ${x},205`} fill="#A0703E" />
        </g>
      ))}
      {/* Rails */}
      <rect x="0" y="230" width="1440" height="6" rx="3" fill="#A0703E" />
      <rect x="0" y="248" width="1440" height="6" rx="3" fill="#A0703E" />

      {/* ── Trees / bushes ── */}
      {/* Left cluster */}
      <rect x="30" y="218" width="8" height="30" fill="#6B4226" />
      <circle cx="34" cy="210" r="22" fill="#2E8020" />
      <circle cx="22" cy="218" r="16" fill="#338A24" />
      <circle cx="48" cy="216" r="18" fill="#2A7A1C" />

      <rect x="210" y="225" width="7" height="22" fill="#6B4226" />
      <circle cx="214" cy="218" r="17" fill="#338A24" />
      <circle cx="202" cy="224" r="12" fill="#2E8020" />

      {/* Right cluster */}
      <rect x="1310" y="218" width="8" height="30" fill="#6B4226" />
      <circle cx="1314" cy="210" r="22" fill="#2E8020" />
      <circle cx="1300" cy="218" r="16" fill="#338A24" />
      <circle cx="1328" cy="216" r="18" fill="#2A7A1C" />

      <rect x="1130" y="225" width="7" height="22" fill="#6B4226" />
      <circle cx="1134" cy="218" r="17" fill="#338A24" />
      <circle cx="1148" cy="224" r="12" fill="#2E8020" />

      {/* Mid tree */}
      <rect x="718" y="195" width="8" height="38" fill="#6B4226" />
      <circle cx="722" cy="185" r="26" fill="#2E8020" />
      <circle cx="706" cy="194" r="18" fill="#338A24" />
      <circle cx="740" cy="192" r="20" fill="#2A7A1C" />

      {/* ── Rocks ── */}
      <ellipse cx="490" cy="274" rx="28" ry="18" fill="#8A8AAA" />
      <ellipse cx="508" cy="272" rx="18" ry="13" fill="#9898B8" />
      <ellipse cx="950" cy="276" rx="22" ry="14" fill="#8A8AAA" />
      <ellipse cx="965" cy="274" rx="14" ry="10" fill="#9898B8" />
      <ellipse cx="140" cy="278" rx="18" ry="12" fill="#8A8AAA" />
      <ellipse cx="1300" cy="277" rx="20" ry="13" fill="#8A8AAA" />

      {/* ── Flowers ── */}
      {[
        [260, 270], [370, 275], [580, 272], [680, 278], [760, 271],
        [860, 276], [1050, 273], [1180, 270], [1240, 277], [430, 282],
      ].map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx},${fy})`}>
          {[0,45,90,135,180,225,270,315].map((a, j) => (
            <ellipse
              key={j}
              cx={Math.cos((a * Math.PI) / 180) * 6}
              cy={Math.sin((a * Math.PI) / 180) * 6}
              rx="3.5" ry="2.5"
              fill="white"
              transform={`rotate(${a})`}
            />
          ))}
          <circle cx="0" cy="0" r="4" fill="#F5D020" />
        </g>
      ))}

      {/* ── Grass blades ── */}
      {[100,200,320,460,550,650,830,920,1010,1100,1220,1370].map((gx) => (
        <g key={gx}>
          <path d={`M${gx},280 Q${gx - 4},268 ${gx},260`} stroke="#2A7A18" strokeWidth="2" fill="none" />
          <path d={`M${gx + 8},282 Q${gx + 12},268 ${gx + 7},258`} stroke="#338A20" strokeWidth="2" fill="none" />
        </g>
      ))}
    </svg>
  );
}

// ── Login page ────────────────────────────────────────────────────────────────
function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");

  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpStep, setOtpStep] = useState<OtpStep>("mobile");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setOtpStep("mobile");
    setPassword("");
    setPasswordFocused(false);
  }

  function finishLogin(name: string | null) {
    setSession({ mobile, name: name ?? `+91 ${mobile}` });
    window.location.href = "/";
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginWithPassword({ data: { mobile, password } });
      await finishLogin(result.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendLoginOtp({ data: { mobile } });
      setOtpStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const otpString = otp.join("");
    if (otpString.length < 4) {
      setError("Enter the OTP sent to your mobile");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyLoginOtp({ data: { mobile, otp: otpString } });
      await finishLogin(result.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...otp];
      digits.forEach((d, i) => { if (i < 6) next[i] = d; });
      setOtp(next);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="login-stage">
      <LandscapeBackground />

      <main className="login-panel">
        <div className="login-mascot">
          <DogMascot
            eyesCovered={passwordFocused && !showPassword}
            peeking={passwordFocused && showPassword}
            pending={loading}
          />
        </div>

        <section className="login-card" aria-label="Okie Dokie staff sign in">
          <div className="mb-5 pt-2 text-center">
            <h1 className="font-display text-2xl font-bold">Welcome back, friend.</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>
          </div>

          {!(mode === "otp" && otpStep === "otp") && (
            <div className="mb-5 flex rounded-xl border border-border bg-muted p-1">
              <Button
                type="button"
                variant={mode === "password" ? "secondary" : "ghost"}
                onClick={() => switchMode("password")}
                aria-pressed={mode === "password"}
                className="h-10 flex-1 gap-2 rounded-lg text-sm font-semibold"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Password
              </Button>
              <Button
                type="button"
                variant={mode === "otp" ? "secondary" : "ghost"}
                onClick={() => switchMode("otp")}
                aria-pressed={mode === "otp"}
                className="h-10 flex-1 gap-2 rounded-lg text-sm font-semibold"
              >
                <Smartphone className="h-3.5 w-3.5" />
                OTP
              </Button>
            </div>
          )}

          {mode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Use your registered staff account</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    +91
                  </span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Mobile number"
                    className="h-12 rounded-xl pl-11 font-mono tracking-widest"
                    aria-label="Mobile number"
                    value={mobile}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                    autoFocus
                    autoComplete="tel-national"
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="h-12 rounded-xl pr-12"
                    aria-label="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl bg-seal font-semibold text-seal-foreground hover:bg-seal/90"
                disabled={loading || mobile.length !== 10 || !password}
              >
                {loading ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </form>
          )}

          {mode === "otp" && otpStep === "mobile" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">We'll send a one-time password to your mobile</p>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Mobile number"
                  className="h-12 rounded-xl pl-11 font-mono tracking-widest"
                  aria-label="Mobile number"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                  autoFocus
                  autoComplete="tel-national"
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl bg-seal font-semibold text-seal-foreground hover:bg-seal/90"
                disabled={loading || mobile.length !== 10}
              >
                {loading ? "Sending…" : (<>Get OTP <ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </form>
          )}

          {mode === "otp" && otpStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <p className="font-display text-lg font-semibold">Enter OTP</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Sent to +91 {mobile}</p>
              </div>

              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`OTP digit ${i + 1}`}
                    className="h-12 w-full rounded-xl text-center font-mono text-xl font-bold"
                    disabled={loading}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                  />
                ))}
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl bg-seal font-semibold text-seal-foreground hover:bg-seal/90"
                disabled={loading || otp.join("").length < 4}
              >
                {loading ? "Verifying…" : (<><ShieldCheck className="h-4 w-4" /> Verify & Sign in</>)}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => { setOtpStep("mobile"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="h-9 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                <RotateCcw className="h-3 w-3" /> Change number
              </Button>
            </form>
          )}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4">
            <Seal className="h-8 w-8 text-primary" topText="MOM PORTAL" bottomText="OKIE DOKIE">
              <image href={logoUrl} x="23" y="23" width="54" height="54" />
            </Seal>
            <span className="text-xs font-medium text-muted-foreground">Okie Dokie · MOM Portal</span>
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Only registered Okie Dokie staff can sign in
        </p>
      </main>
    </div>
  );
}
