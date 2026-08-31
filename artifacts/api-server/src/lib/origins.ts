import type { Request } from "express";

export function configuredOrigins(): Set<string> {
  const origins = new Set(
    (process.env.REPLIT_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim())
      .filter(Boolean)
      .map((domain) => `https://${domain}`),
  );
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:19230");
    origins.add("http://127.0.0.1:19230");
  }
  return origins;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value?.split(",", 1)[0];
  return first?.trim();
}

export function trustedRequestOrigin(req: Request): string | null {
  const proto = firstHeader(req.headers["x-forwarded-proto"]) ?? req.protocol;
  const host = firstHeader(req.headers["x-forwarded-host"]) ?? req.get("host");
  if (!host) return null;
  const origin = `${proto}://${host}`;
  return configuredOrigins().has(origin) ? origin : null;
}

export function safeReturnPath(value: unknown, trustedOrigin: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  try {
    const url = new URL(value, `${trustedOrigin}/`);
    if (url.origin !== trustedOrigin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}