import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  buildClearRefreshCookieOptions,
  buildRefreshCookieOptions
} from "../services/token.service.js";
import * as authService from "../services/auth.service.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(env.cookieName, refreshToken, buildRefreshCookieOptions());
};

export const signup = asyncHandler(async (req, res) => {
  const session = await authService.signup(req.body, req);
  setRefreshCookie(res, session.refreshToken);
  res.status(201).json({ user: session.user, accessToken: session.accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body, req);
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: session.user, accessToken: session.accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refreshSession(req.cookies[env.cookieName], req);
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: session.user, accessToken: session.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies[env.cookieName]);
  res.clearCookie(env.cookieName, buildClearRefreshCookieOptions());
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.clearCookie(env.cookieName, buildClearRefreshCookieOptions());
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const reset = await authService.createPasswordReset(req.body.email);

  if (reset) {
    const resetUrl = `${env.clientUrl}/reset-password/${reset.token}`;
    try {
      await sendPasswordResetEmail({ to: reset.user.email, resetUrl });
    } catch (error) {
      console.error("Unable to send password reset email", error);
    }
  }

  res.json({ message: "If an account exists with this email, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword({ token: req.params.token, newPassword: req.body.newPassword });
  res.clearCookie(env.cookieName, buildClearRefreshCookieOptions());
  res.json({ message: "Password reset successfully" });
});
