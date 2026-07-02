import crypto from "crypto";
import { env } from "../config/env.js";

export const hashToken = (token) =>
  crypto.createHmac("sha256", env.refreshTokenSecret).update(token).digest("hex");

export const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString("base64url");
