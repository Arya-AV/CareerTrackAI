import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { hashToken, randomToken } from "../utils/hash.js";

const refreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);
  return expiresAt;
};

export const createAccessToken = (user) =>
  jwt.sign(
    {
      email: user.email
    },
    env.jwtAccessSecret,
    {
      subject: user._id.toString(),
      expiresIn: env.accessTokenTtl
    }
  );

export const createRefreshToken = ({ familyId } = {}) => {
  const token = randomToken();
  return {
    token,
    tokenHash: hashToken(token),
    familyId: familyId || randomToken(16),
    expiresAt: refreshExpiry()
  };
};

export const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  domain: env.cookieDomain,
  path: "/api/auth",
  expires: refreshExpiry()
});

export const buildClearRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  domain: env.cookieDomain,
  path: "/api/auth"
});

export const hashRefreshToken = hashToken;
