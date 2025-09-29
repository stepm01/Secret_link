const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

const ensureCrypto = () => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
};

const encodeChars = (bytes) => String.fromCharCode(...bytes);
const decodeChars = (chars) => chars.split("").map((char) => char.charCodeAt(0));

export const encodeBase64 = (bytes) => {
  ensureCrypto();
  return window.btoa(encodeChars(bytes));
};

export const decodeBase64 = (base64) => {
  ensureCrypto();
  return new Uint8Array(decodeChars(window.atob(base64)));
};

export const generateRandomBytes = (length) => {
  ensureCrypto();
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
};

export const deriveKey = async (passwordBytes, saltBytes, iterations = 150000) => {
  ensureCrypto();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptString = async (plaintext, key) => {
  ensureCrypto();
  const iv = generateRandomBytes(12);
  const encoded = TEXT_ENCODER.encode(plaintext);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoded
  );

  return { ciphertext: new Uint8Array(encrypted), iv };
};

export const decryptToString = async (ciphertextBytes, key, ivBytes) => {
  ensureCrypto();
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    ciphertextBytes
  );

  return TEXT_DECODER.decode(decrypted);
};

export const createEncryptedPayload = async (plaintext) => {
  const passwordBytes = generateRandomBytes(32);
  const saltBytes = generateRandomBytes(16);
  const key = await deriveKey(passwordBytes, saltBytes);
  const { ciphertext, iv } = await encryptString(plaintext, key);

  return {
    encryptedBase64: encodeBase64(ciphertext),
    ivBase64: encodeBase64(iv),
    saltBase64: encodeBase64(saltBytes),
    passwordBase64: encodeBase64(passwordBytes),
  };
};

export const decryptPayload = async (
  encryptedBase64,
  ivBase64,
  saltBase64,
  passwordBase64
) => {
  const ciphertextBytes = decodeBase64(encryptedBase64);
  const ivBytes = decodeBase64(ivBase64);
  const saltBytes = decodeBase64(saltBase64);
  const passwordBytes = decodeBase64(passwordBase64);
  const key = await deriveKey(passwordBytes, saltBytes);
  return decryptToString(ciphertextBytes, key, ivBytes);
};

export const extractKeyFromHash = () => {
  if (typeof window === "undefined" || !window.location?.hash) {
    return "";
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.substring(1)
    : window.location.hash;

  const params = new URLSearchParams(hash);
  return params.get("key") || "";
};
