import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendLoginOtp, verifyLoginOtp, loginWithPassword } from "@/lib/erp-auth.functions";
import { setSession, getSession } from "@/lib/auth";

export const Route = createFileRoute("/login")({
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
function DogMascot({ eyesCovered }: { eyesCovered: boolean }) {
  const common = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    transition: "opacity 0.25s ease",
  };
  return (
    <div style={{ position: "relative", width: 170, height: 190 }}>
      {/* ── Normal: eyes open ── */}
      <svg
        viewBox="0 0 170 190"
        style={{ ...common, opacity: eyesCovered ? 0 : 1 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body */}
        <ellipse cx="85" cy="168" rx="52" ry="38" fill="#E8A030" />
        <ellipse cx="85" cy="172" rx="34" ry="38" fill="#F5EDE0" />
        {/* Left ear */}
        <ellipse cx="36" cy="68" rx="20" ry="30" fill="#CF8220" transform="rotate(-18 36 68)" />
        <ellipse cx="36" cy="68" rx="12" ry="20" fill="#F0C0A0" transform="rotate(-18 36 68)" />
        {/* Right ear */}
        <ellipse cx="134" cy="68" rx="20" ry="30" fill="#CF8220" transform="rotate(18 134 68)" />
        <ellipse cx="134" cy="68" rx="12" ry="20" fill="#F0C0A0" transform="rotate(18 134 68)" />
        {/* Head */}
        <ellipse cx="85" cy="84" rx="56" ry="54" fill="#E8A030" />
        {/* White forehead patch */}
        <ellipse cx="85" cy="66" rx="24" ry="22" fill="#F5EDE0" />
        {/* Eye whites */}
        <ellipse cx="66" cy="82" rx="14" ry="15" fill="white" />
        <ellipse cx="104" cy="82" rx="14" ry="15" fill="white" />
        {/* Pupils */}
        <circle cx="68" cy="84" r="10" fill="#120A02" />
        <circle cx="102" cy="84" r="10" fill="#120A02" />
        {/* Eye shines */}
        <circle cx="72" cy="80" r="3.5" fill="white" />
        <circle cx="106" cy="80" r="3.5" fill="white" />
        <circle cx="65" cy="88" r="1.5" fill="white" opacity="0.6" />
        <circle cx="99" cy="88" r="1.5" fill="white" opacity="0.6" />
        {/* Blush */}
        <ellipse cx="50" cy="96" rx="11" ry="7" fill="#F09090" opacity="0.38" />
        <ellipse cx="120" cy="96" rx="11" ry="7" fill="#F09090" opacity="0.38" />
        {/* Nose */}
        <ellipse cx="85" cy="104" rx="9" ry="6.5" fill="#1E0E04" />
        <circle cx="82" cy="102" r="2" fill="white" opacity="0.4" />
        {/* Mouth */}
        <path d="M74 112 Q85 122 96 112" stroke="#1E0E04" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Tongue */}
        <ellipse cx="85" cy="120" rx="8" ry="6" fill="#E05070" />
        <line x1="85" y1="114" x2="85" y2="126" stroke="#C03055" strokeWidth="1.2" />
        {/* Left arm normal */}
        <ellipse cx="36" cy="162" rx="18" ry="26" fill="#E8A030" />
        <ellipse cx="36" cy="182" rx="16" ry="10" fill="#CF8220" />
        <ellipse cx="28" cy="180" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="36" cy="177" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="44" cy="180" rx="5" ry="3.5" fill="#B87018" />
        {/* Right arm normal */}
        <ellipse cx="134" cy="162" rx="18" ry="26" fill="#E8A030" />
        <ellipse cx="134" cy="182" rx="16" ry="10" fill="#CF8220" />
        <ellipse cx="126" cy="180" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="134" cy="177" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="142" cy="180" rx="5" ry="3.5" fill="#B87018" />
      </svg>

      {/* ── Eyes covered: paws up ── */}
      <svg
        viewBox="0 0 170 190"
        style={{ ...common, opacity: eyesCovered ? 1 : 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body */}
        <ellipse cx="85" cy="168" rx="52" ry="38" fill="#E8A030" />
        <ellipse cx="85" cy="172" rx="34" ry="38" fill="#F5EDE0" />
        {/* Left ear */}
        <ellipse cx="36" cy="68" rx="20" ry="30" fill="#CF8220" transform="rotate(-18 36 68)" />
        <ellipse cx="36" cy="68" rx="12" ry="20" fill="#F0C0A0" transform="rotate(-18 36 68)" />
        {/* Right ear */}
        <ellipse cx="134" cy="68" rx="20" ry="30" fill="#CF8220" transform="rotate(18 134 68)" />
        <ellipse cx="134" cy="68" rx="12" ry="20" fill="#F0C0A0" transform="rotate(18 134 68)" />
        {/* Head */}
        <ellipse cx="85" cy="84" rx="56" ry="54" fill="#E8A030" />
        {/* White forehead patch */}
        <ellipse cx="85" cy="66" rx="24" ry="22" fill="#F5EDE0" />
        {/* Blush (still visible) */}
        <ellipse cx="50" cy="96" rx="11" ry="7" fill="#F09090" opacity="0.38" />
        <ellipse cx="120" cy="96" rx="11" ry="7" fill="#F09090" opacity="0.38" />
        {/* Nose */}
        <ellipse cx="85" cy="104" rx="9" ry="6.5" fill="#1E0E04" />
        <circle cx="82" cy="102" r="2" fill="white" opacity="0.4" />
        {/* Mouth */}
        <path d="M74 112 Q85 122 96 112" stroke="#1E0E04" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Tongue */}
        <ellipse cx="85" cy="120" rx="8" ry="6" fill="#E05070" />
        <line x1="85" y1="114" x2="85" y2="126" stroke="#C03055" strokeWidth="1.2" />
        {/* Left arm — raised to cover left eye */}
        <ellipse cx="52" cy="102" rx="20" ry="16" fill="#E8A030" transform="rotate(-40 52 102)" />
        <ellipse cx="40" cy="88" rx="18" ry="12" fill="#CF8220" />
        <ellipse cx="31" cy="84" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="40" cy="81" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="49" cy="84" rx="5" ry="3.5" fill="#B87018" />
        {/* Right arm — raised to cover right eye */}
        <ellipse cx="118" cy="102" rx="20" ry="16" fill="#E8A030" transform="rotate(40 118 102)" />
        <ellipse cx="130" cy="88" rx="18" ry="12" fill="#CF8220" />
        <ellipse cx="121" cy="84" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="130" cy="81" rx="5" ry="3.5" fill="#B87018" />
        <ellipse cx="139" cy="84" rx="5" ry="3.5" fill="#B87018" />
      </svg>
    </div>
  );
}

// ── Landscape background ──────────────────────────────────────────────────────
function LandscapeBackground() {
  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: "46%", pointerEvents: "none", zIndex: 0 }}
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
  const [requestId, setRequestId] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
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
      const result = await sendLoginOtp({ data: { mobile } });
      setRequestId(result.requestId);
      setSessionCookie(result.sessionCookie ?? "");
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
      const result = await verifyLoginOtp({ data: { mobile, otp: otpString, requestId, sessionCookie } });
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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFCFF 0%, #F0F8E8 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: "max(16px, env(safe-area-inset-left,0px))",
        paddingRight: "max(16px, env(safe-area-inset-right,0px))",
        paddingBlock: "2rem",
      }}
    >
      <LandscapeBackground />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 380 }}>
        {/* Dog mascot */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: -18, position: "relative", zIndex: 20 }}>
          <DogMascot eyesCovered={passwordFocused} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg" style={{ position: "relative", zIndex: 10 }}>

          {!(mode === "otp" && otpStep === "otp") && (
            <div className="mb-5 flex rounded-xl border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => switchMode("password")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === "password"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Password
              </button>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === "otp"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                OTP
              </button>
            </div>
          )}

          {mode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Sign in with your ERP credentials</p>
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
                    className="pl-11 font-mono tracking-widest"
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
                    className="pr-10"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
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
                className="w-full gap-2 font-semibold"
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
                  className="pl-11 font-mono tracking-widest"
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
                className="w-full gap-2 font-semibold"
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
                    className="h-12 w-full text-center font-mono text-xl font-bold"
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
                className="w-full gap-2 font-semibold"
                disabled={loading || otp.join("").length < 4}
              >
                {loading ? "Verifying…" : (<><ShieldCheck className="h-4 w-4" /> Verify & Sign in</>)}
              </Button>

              <button
                type="button"
                onClick={() => { setOtpStep("mobile"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                <RotateCcw className="h-3 w-3" /> Change number
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Only registered Okie Dokie staff can sign in
        </p>
      </div>
    </div>
  );
}
