import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// The internal JWT is what the gateway sends to backend services. It is signed with a
// DIFFERENT secret than the customer-facing access token, so a leaked/stolen access
// token can never be replayed directly against a backend service — and backend
// services only trust this issuer/audience pair, never the customer token.
const INTERNAL_SECRET = process.env.JWT_INTERNAL_SECRET ?? "dev-internal-secret-change-me";
const INTERNAL_TTL: NonNullable<SignOptions["expiresIn"]> =
  (process.env.JWT_INTERNAL_TTL ?? "60s") as NonNullable<SignOptions["expiresIn"]>;

if (!process.env.JWT_INTERNAL_SECRET) {
  console.warn("WARNING: using dev internal JWT secret — set JWT_INTERNAL_SECRET in production");
}

export interface InternalClaims {
  sub: string;
  email: string;
  role: string;
  iss: "api-gateway";
  aud: "internal-services";
}

export function mintInternalJwt(user: { id: string; email: string; role: string }): string {
  const payload: InternalClaims = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: "api-gateway",
    aud: "internal-services",
  };
  return jwt.sign(payload, INTERNAL_SECRET, { expiresIn: INTERNAL_TTL });
}
