import { ensureProfile, getProfile } from './storage';

// ============================================================
// PBKDF2 cryptographic authentication via Web Crypto API
// Username: 2-24 chars, Password: min 6 chars
// Stores salt + hash in the `users` table via ensureProfile — never plaintext.
// ============================================================

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;

function validateNickname(nickname: string): string | null {
  if (nickname.length < 2) return 'Никнейм: минимум 2 символа';
  if (nickname.length > 24) return 'Никнейм: максимум 24 символа';
  if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) return 'Никнейм: только латиница, цифры, _ и -';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Пароль: минимум 6 символов';
  return null;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const salt = hexToBuf(saltHex);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEYLEN * 8,
  );
  return bufToHex(bits);
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AuthResult {
  ok: boolean;
  nickname: string;
  error: string;
}

export async function registerAccount(
  nickname: string,
  password: string,
): Promise<AuthResult> {
  const nickErr = validateNickname(nickname);
  if (nickErr) return { ok: false, nickname, error: nickErr };
  const passErr = validatePassword(password);
  if (passErr) return { ok: false, nickname, error: passErr };

  const salt = randomSalt();
  const hash = await deriveHash(password, salt);

  const result = await ensureProfile(nickname, hash, salt);
  if (!result.ok) {
    return { ok: false, nickname, error: result.error };
  }

  return { ok: true, nickname, error: '' };
}

export async function loginAccount(
  nickname: string,
  password: string,
): Promise<AuthResult> {
  const nickErr = validateNickname(nickname);
  if (nickErr) return { ok: false, nickname, error: nickErr };
  const passErr = validatePassword(password);
  if (passErr) return { ok: false, nickname, error: passErr };

  const profile = await getProfile(nickname);
  if (!profile) {
    return { ok: false, nickname, error: 'Пользователь не найден' };
  }

  const computedHash = await deriveHash(password, profile.salt);
  if (computedHash !== profile.hash) {
    return { ok: false, nickname, error: 'Неверный пароль' };
  }

  return { ok: true, nickname, error: '' };
}
