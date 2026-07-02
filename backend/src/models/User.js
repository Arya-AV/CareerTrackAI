import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedByTokenHash: String,
    userAgent: String,
    ip: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: String,
    googleId: { type: String, sparse: true, index: true },
    avatarUrl: String,
    profile: {
      targetRoles: [{ type: String, trim: true }],
      skills: [{ type: String, trim: true }],
      education: String,
      experienceLevel: String,
      resumeText: String,
      resumeKeywords: [{ type: String, trim: true }]
    },
    preferences: {
      timezone: { type: String, default: "Asia/Calcutta" },
      reminderEmailEnabled: { type: Boolean, default: true },
      defaultFollowUpDays: { type: Number, default: 7 }
    },
    refreshTokens: [refreshTokenSchema],
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  if (!this.passwordHash) {
    return false;
  }

  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
