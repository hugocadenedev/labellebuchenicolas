import crypto from "node:crypto";
import { appConfig } from "./config.js";

const sessionTtlMs = 1000 * 60 * 60 * 12;

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", appConfig.admin.sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
}

export function createAdminSessionToken(admin) {
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    exp: Date.now() + sessionTtlMs
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    if (!payload?.sub || !payload?.email || !payload?.role || !payload?.exp) {
      return null;
    }

    if (Number(payload.exp) <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function requireAdminSession(req, res, next) {
  const token = readBearerToken(req);
  const admin = verifyAdminSessionToken(token);
  if (!admin) {
    return res.status(401).json({ message: "Session admin invalide ou expiree." });
  }

  req.admin = admin;
  return next();
}