import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { resolveClientAddress } from "./proxy";

function pepper() {
  const value = process.env.SESSION_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("SESSION_PEPPER must contain at least 32 characters");
  }
  return value;
}

export function hashSensitiveIdentifier(value: string) {
  return createHmac("sha256", pepper()).update(value).digest("hex");
}

export async function getRequestIpHash() {
  const requestHeaders = await headers();
  const ip = resolveClientAddress(requestHeaders, {
    VERCEL: process.env.VERCEL,
    TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
  });
  return hashSensitiveIdentifier(ip);
}
