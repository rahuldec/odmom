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
    return { ok: true };
  });

// OTP verify — endpoint: /api/verify/otp?source=erp (no request_id needed)
export const verifyLoginOtp = createServerFn({ method: "GET" })
  .validator(
    z.object({
      mobile: z.string(),
      otp: z.string().min(4).max(6),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(
      `${ERP_API}/verify/otp?mobile=${data.mobile}&otp=${data.otp}&source=erp`,
    );
    const json = (await res.json()) as ErpResponse;
    if (!res.ok) throw new Error(json.message ?? "Invalid or expired OTP");
    return { name: (json.name as string) ?? nameFromJwt(json.token) ?? null };
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
