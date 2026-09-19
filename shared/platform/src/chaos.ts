// Runtime chaos flags. Failure switches are plain env vars read per call by
// the consumers (INVENTORY_FAIL_RESERVE, PAYMENT_DECLINE_CODE, ...), so the
// admin dashboard can flip them at runtime via POST /admin/chaos without a
// restart. Each service allowlists its own flags.

export function getChaosFlags(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}

export function setChaosFlag(
  allowed: string[],
  name: string,
  value: string,
): Record<string, string> {
  if (!allowed.includes(name)) {
    throw new Error(
      `unknown chaos flag ${name} (allowed: ${allowed.join(", ") || "none"})`,
    );
  }
  if (value === "") {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  console.log(`[chaos] ${name}=${value === "" ? "<cleared>" : value}`);
  return getChaosFlags(allowed);
}
