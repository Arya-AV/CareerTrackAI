import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { hashToken, randomToken } from "../utils/hash.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken
} from "./token.service.js";

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  profile: user.profile,
  preferences: user.preferences
});

const attachRefreshToken = async (user, refreshToken, req) => {
  user.refreshTokens.push({
    tokenHash: refreshToken.tokenHash,
    familyId: refreshToken.familyId,
    expiresAt: refreshToken.expiresAt,
    userAgent: req.get("user-agent"),
    ip: req.ip
  });

  await user.save();
};

export const signup = async ({ name, email, password }, req) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = new User({ name, email });
  await user.setPassword(password);

  const refreshToken = createRefreshToken();
  await attachRefreshToken(user, refreshToken, req);

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user),
    refreshToken: refreshToken.token
  };
};

export const login = async ({ email, password }, req) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const refreshToken = createRefreshToken();
  await attachRefreshToken(user, refreshToken, req);

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user),
    refreshToken: refreshToken.token
  };
};

export const refreshSession = async (rawToken, req) => {
  if (!rawToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const incomingHash = hashRefreshToken(rawToken);
  const user = await User.findOne({ "refreshTokens.tokenHash": incomingHash });

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const storedToken = user.refreshTokens.find((token) => token.tokenHash === incomingHash);
  const now = new Date();

  if (!storedToken || storedToken.expiresAt <= now) {
    throw new ApiError(401, "Refresh token expired");
  }

  if (storedToken.revokedAt) {
    user.refreshTokens.forEach((token) => {
      if (token.familyId === storedToken.familyId && !token.revokedAt) {
        token.revokedAt = now;
      }
    });
    await user.save();
    throw new ApiError(401, "Refresh token reuse detected");
  }

  const nextRefreshToken = createRefreshToken({ familyId: storedToken.familyId });
  storedToken.revokedAt = now;
  storedToken.replacedByTokenHash = nextRefreshToken.tokenHash;

  user.refreshTokens.push({
    tokenHash: nextRefreshToken.tokenHash,
    familyId: nextRefreshToken.familyId,
    expiresAt: nextRefreshToken.expiresAt,
    userAgent: req.get("user-agent"),
    ip: req.ip
  });

  await user.save();

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user),
    refreshToken: nextRefreshToken.token
  };
};

export const logout = async (rawToken) => {
  if (!rawToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawToken);
  await User.updateOne(
    { "refreshTokens.tokenHash": tokenHash },
    { $set: { "refreshTokens.$.revokedAt": new Date() } }
  );
};

export const logoutAll = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return;
  }

  const now = new Date();
  user.refreshTokens.forEach((token) => {
    if (!token.revokedAt) {
      token.revokedAt = now;
    }
  });
  await user.save();
};

export const createPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return null;
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  user.resetPasswordToken = hashToken(token);
  user.resetPasswordExpires = expiresAt;

  await user.save();

  return { user, token, expiresAt };
};

export const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  await user.setPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const now = new Date();
  user.refreshTokens.forEach((refreshToken) => {
    if (!refreshToken.revokedAt) {
      refreshToken.revokedAt = now;
    }
  });

  await user.save();
};

export const getPublicUser = publicUser;
