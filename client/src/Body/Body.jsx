import React, { useEffect, useState } from "react";
import SecureLinkPage from "./ShowLink/SecureLinkPage";

const Body = () => {
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecureLinkPage, setShowSecureLinkPage] = useState(false);
  const [secretId, setSecretId] = useState("");

  useEffect(() => {
    const url = window.location.href;
    const id = url.split("/").pop();

    if (id && /^[A-Za-z0-9]+$/.test(id)) {
      setShowSecureLinkPage(true);
      setSecretId(id);
    }
  }, []);

  const handleSecretChange = (e) => {
    setSecret(e.target.value);
  };

  const generatePassword = () => {
    return window.crypto.getRandomValues(new Uint8Array(32));
  };

  const deriveKey = async (password, salt) => {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      password,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  };

  const encryptMessage = async (key, message) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encodedMessage
    );
    return { encrypted, iv };
  };

  const createSecureLink = async () => {
    const password = generatePassword();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const { encrypted, iv } = await encryptMessage(key, secret);

    const encryptedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encrypted))
    );
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const saltBase64 = btoa(String.fromCharCode(...salt));

    const response = await fetch("/api/store-secret", {
      method: "POST",
      body: JSON.stringify({
        encrypted: encryptedBase64,
        iv: ivBase64,
        salt: saltBase64,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const { link } = await response.json();

    navigator.clipboard.writeText(link);
    setCopied(true);
    setSecret("");
    setTimeout(() => {
      setCopied(false);
    }, 5000);
  };

  return (
    <div style={bodyStyle}>
      {showSecureLinkPage ? (
        <SecureLinkPage secretId={secretId} />
      ) : (
        <>
          <h1 style={headerStyle}>
            Securely send and receive sensitive information
          </h1>
          <p style={subHeaderStyle}>
            Client-side encrypted one-time secrets since 2016
          </p>
          <div style={inputContainerStyle}>
            <input
              type="text"
              placeholder="Enter a secret here!"
              value={secret}
              onChange={handleSecretChange}
              style={inputStyle}
              disabled={copied}
            />
            <button onClick={createSecureLink} style={buttonStyle}>
              {copied ? "It was copied" : "Create Secure Link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const bodyStyle = {
  padding: "40px",
  textAlign: "center",
};

const headerStyle = {
  fontSize: "32px",
  marginBottom: "20px",
};

const subHeaderStyle = {
  fontSize: "20px",
  marginBottom: "30px",
};

const inputContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const inputStyle = {
  padding: "30px",
  fontSize: "18px",
  margin: "10px 0",
  width: "80%",
  borderRadius: "10px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const buttonStyle = {
  padding: "15px 30px",
  backgroundColor: "#4B0082",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "18px",
  marginTop: "10px",
  width: "50%",
  maxWidth: "300px",
};

export default Body;
