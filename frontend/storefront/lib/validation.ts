export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export function isUKPostcode(v: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim());
}

export function isPhone(v: string): boolean {
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export function formatCardNumber(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function luhnOk(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 15 || digits.length > 16) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function expiryOk(v: string, now = new Date()): boolean {
  const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const end = new Date(2000 + parseInt(m[2], 10), parseInt(m[1], 10), 0);
  return end >= new Date(now.getFullYear(), now.getMonth(), 1);
}

export function isCvc(v: string): boolean {
  return /^\d{3,4}$/.test(v.trim());
}

export type FieldErrors = Record<string, string | undefined>;

export function hasErrors(e: FieldErrors): boolean {
  return Object.values(e).some(Boolean);
}
