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

const derivePassphraseBytes = async (
  passphrase,
  saltBytes,
  iterations = 200000
) => {
  ensureCrypto();
  const passphraseKey = await window.crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    256
  );

  return new Uint8Array(derivedBits);
};

const deriveKey = async (passwordBytes, saltBytes, iterations = 150000) => {
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

const combinePasswordAndPassphrase = async (
  passwordBytes,
  passphrase,
  existingPassphraseSaltBytes = null
) => {
  if (!passphrase) {
    return { combinedBytes: passwordBytes, passphraseSaltBytes: null };
  }

  const passphraseSaltBytes =
    existingPassphraseSaltBytes || generateRandomBytes(16);
  const passphraseBytes = await derivePassphraseBytes(
    passphrase,
    passphraseSaltBytes
  );
  const combinedBytes = new Uint8Array(passwordBytes.length);

  for (let index = 0; index < passwordBytes.length; index += 1) {
    combinedBytes[index] = passwordBytes[index] ^ passphraseBytes[index];
  }

  return { combinedBytes, passphraseSaltBytes };
};

export const createEncryptedPayload = async (plaintext, options = {}) => {
  const passwordBytes = generateRandomBytes(32);
  const saltBytes = generateRandomBytes(16);
  const { combinedBytes, passphraseSaltBytes } =
    await combinePasswordAndPassphrase(passwordBytes, options.passphrase);
  const key = await deriveKey(combinedBytes, saltBytes);
  const { ciphertext, iv } = await encryptString(plaintext, key);

  return {
    encryptedBase64: encodeBase64(ciphertext),
    ivBase64: encodeBase64(iv),
    saltBase64: encodeBase64(saltBytes),
    passwordBase64: encodeBase64(passwordBytes),
    passphraseSaltBase64: passphraseSaltBytes
      ? encodeBase64(passphraseSaltBytes)
      : null,
    requiresPassphrase: Boolean(options.passphrase),
  };
};

export const decryptPayload = async (
  encryptedBase64,
  ivBase64,
  saltBase64,
  passwordBase64,
  options = {}
) => {
  const ciphertextBytes = decodeBase64(encryptedBase64);
  const ivBytes = decodeBase64(ivBase64);
  const saltBytes = decodeBase64(saltBase64);
  const passwordBytes = decodeBase64(passwordBase64);

  if (options.requiresPassphrase && !options.passphrase) {
    throw new Error("Passphrase required to decrypt this secret.");
  }

  const passphraseSaltBytes = options.passphraseSaltBase64
    ? decodeBase64(options.passphraseSaltBase64)
    : null;

  const { combinedBytes } = await combinePasswordAndPassphrase(
    passwordBytes,
    options.passphrase,
    passphraseSaltBytes
  );
  const key = await deriveKey(combinedBytes, saltBytes);
  return decryptToString(ciphertextBytes, key, ivBytes);
};

export const extractKeyFromHash = () => {
  if (typeof window === "undefined" || !window.location?.hash) {
    return {
      passwordBase64: "",
      passphraseSaltBase64: "",
      requiresPassphrase: false,
      passphraseHint: "",
    };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.substring(1)
    : window.location.hash;

  const params = new URLSearchParams(hash);
  return {
    passwordBase64: params.get("key") || "",
    passphraseSaltBase64: params.get("pps") || "",
    requiresPassphrase: params.get("pp") === "1",
    passphraseHint: params.get("hint") || "",
  };
};
