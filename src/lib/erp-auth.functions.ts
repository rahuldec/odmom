import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ERP_API = "https://admission-api.odpay.in/api";
const ERP_BASE = "https://admission-api.odpay.in";

type ErpResponse = { type: string; request_id?: string; name?: string; message?: string; data?: unknown };

export const sendLoginOtp = createServerFn({ method: "GET" })
  .validator(
    z.object({
      mobile: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${ERP_API}/sendLogin/otp?mobile=${data.mobile}`);
    if (!res.ok) throw new Error("ERP server unreachable");
    const json = (await res.json()) as ErpResponse;
    if (json.type?.toLowerCase() !== "success") {
      throw new Error(json.message ?? "Failed to send OTP");
    }
    // Forward the ERP session cookie so the verify call shares the same session
    const sessionCookie = res.headers.get("set-cookie") ?? "";
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
    if (json.type?.toLowerCase() !== "success") {
      throw new Error(json.message ?? "Invalid or expired OTP");
    }
    return { name: (json.name as string) ?? null };
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
    if (json.type?.toLowerCase() !== "success") {
      throw new Error(json.message ?? "Invalid mobile number or password");
    }
    return { name: (json.name as string) ?? null };
  });
