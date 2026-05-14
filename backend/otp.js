const OTP_TTL_MS = 30 * 60 * 1000;

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createOtpPair(now = Date.now()) {
  return {
    courier: { code: generateOtp(), createdAt: now, usedAt: null },
    client: { code: generateOtp(), createdAt: now, usedAt: null }
  };
}

export function validateOtp(record, submittedCode, now = Date.now()) {
  if (!record) {
    return { ok: false, reason: "OTP_MISSING" };
  }

  if (record.usedAt) {
    return { ok: false, reason: "OTP_ALREADY_USED" };
  }

  if (now - record.createdAt > OTP_TTL_MS) {
    return { ok: false, reason: "OTP_EXPIRED" };
  }

  if (String(submittedCode) !== record.code) {
    return { ok: false, reason: "OTP_INVALID" };
  }

  record.usedAt = now;
  return { ok: true };
}

