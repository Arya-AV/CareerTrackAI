import crypto from "crypto";

export const normalizeText = (value = "") => value.trim().replace(/\s+/g, " ").toLowerCase();

export const sha256 = (value = "") => crypto.createHash("sha256").update(value).digest("hex");
