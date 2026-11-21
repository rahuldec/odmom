import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ERP_API = "https://admission-api.odpay.in/api";
const ERP_BASE = "https://admission-api.odpay.in";

type ErpResponse = { type?: string; token?: string; request_id?: string; name?: string; message?: string; data?: unknown };

// Set-Cookie: "token=eyJ...; Path=/; HttpOnly" → "token=eyJ..."
function parseCookieHeader(setCookie: string): string {
  return setCookie
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

function nameFromJwt(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8"));
    return (payload.name as string) ?? null;
  } catch {
    return null;
  }
}

export const sendLoginOtp = createServerFn({ method: "GET" })
  .validator(
    z.object({
      mobile: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${ERP_API}/sendLogin/otp?mobile=${data.mobile}`);
    const json = (await res.json()) as ErpResponse;
    if (!res.ok) throw new Error(json.message ?? "Failed to send OTP");
    // Forward the ERP session cookie so the verify call shares the same session
    const rawSetCookie = res.headers.get("set-cookie") ?? "";
    const sessionCookie = rawSetCookie ? parseCookieHeader(rawSetCookie) : "";
    return { requestId: json.request_id as string, sessionCookie };
  });

// OTP verify — the ERP rejects unregistered numbers here with "Mobile no. not found"
export const verifyLoginOtp = createServerFn({ method: "GET" })
  .validator(
    z.object({
      mobile: z.string(),
      otp: z.string().min(4).max(6),
      requestId: z.string(),
      sessionCookie: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const headers: Record<string, string> = {};
    if (data.sessionCookie) headers["Cookie"] = data.sessionCookie;
    const res = await fetch(
      `${ERP_API}/verifyLogin/otp?mobile=${data.mobile}&otp=${data.otp}&request_id=${data.requestId}`,
      { headers },
    );
    const json = (await res.json()) as ErpResponse;
    if (!res.ok) throw new Error(json.message ?? "Invalid or expired OTP");
    return { name: nameFromJwt(json.token) ?? (json.name as string) ?? null };
  });

// Password login — POST /loginV2 with {mobile, password}
export const loginWithPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mobile: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
      password: z.string().min(1, "Password is required"),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${ERP_BASE}/loginV2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: data.mobile, password: data.password }),
    });
    const json = (await res.json()) as ErpResponse;
    if (!res.ok) throw new Error(json.message ?? "Invalid mobile number or password");
    return { name: nameFromJwt(json.token) ?? (json.name as string) ?? null };
  });
