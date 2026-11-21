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

function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");

  // Shared
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP flow
  const [otpStep, setOtpStep] = useState<OtpStep>("mobile");
  const [requestId, setRequestId] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password flow
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setOtpStep("mobile");
    setPassword("");
  }

  function finishLogin(name: string | null) {
    setSession({ mobile, name: name ?? `+91 ${mobile}` });
    window.location.href = "/";
  }

  // --- Password login ---
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

  // --- OTP: send ---
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

  // --- OTP: verify ---
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src="/od-seal.png" alt="Okie Dokie" className="h-28 w-28 object-contain" />
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">MOM Portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Okie Dokie · Campus Automation</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

          {/* Mode tabs — shown except when entering OTP */}
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

          {/* Password form */}
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

          {/* OTP: mobile entry */}
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

          {/* OTP: code entry */}
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
