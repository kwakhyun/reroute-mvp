import "server-only";

import { timingSafeEqual } from "node:crypto";
import { hashSensitiveIdentifier } from "@/server/security/request";

type PreviewContext = { userId: string; projectId: string; version: number; fileHash: string };
const PREVIEW_TTL_MS = 15 * 60 * 1000;

function signature(context: PreviewContext, expiresAt: number) {
  return hashSensitiveIdentifier(JSON.stringify(["bid-import-preview-v1", context.userId, context.projectId, context.version, context.fileHash, expiresAt]));
}

export function createBidImportPreviewToken(context: PreviewContext, now = Date.now()) {
  const expiresAt = now + PREVIEW_TTL_MS;
  return `${expiresAt}.${signature(context, expiresAt)}`;
}

export function verifyBidImportPreviewToken(token: string, context: PreviewContext, now = Date.now()) {
  const [expiry, supplied, extra] = token.split(".");
  const expiresAt = Number(expiry);
  if (extra !== undefined || !Number.isSafeInteger(expiresAt) || expiresAt <= now || !supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(context, expiresAt), "hex"));
}
