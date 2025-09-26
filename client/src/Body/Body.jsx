import React, { useEffect, useState } from "react";
import SecureLinkPage from "./ShowLink/SecureLinkPage";

const Body = () => {
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecureLinkPage, setShowSecureLinkPage] = useState(false);
  const [secretId, setSecretId] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [generatedLink, setGeneratedLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const pathSegments = window.location.pathname.split("/").filter(Boolean);
      const potentialId = pathSegments[pathSegments.length - 1];

      if (potentialId && /^[A-Za-z0-9]+$/.test(potentialId)) {
        setShowSecureLinkPage(true);
        setSecretId(potentialId);
      }
    } catch (error) {
      console.error("Failed to parse current URL", error);
    }
  }, []);

  const handleSecretChange = (e) => {
    if (status.type) {
      setStatus({ type: null, message: "" });
    }
    if (generatedLink) {
      setGeneratedLink("");
    }
    setSecret(e.target.value);
  };

  const generatePassword = () => {
    return window.crypto.getRandomValues(new Uint8Array(32));
  };

  const importAesKey = async (keyMaterial) => {
    return window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
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
    if (isProcessing) {
      return;
    }

    const trimmedSecret = secret.trim();
    if (!trimmedSecret) {
      setStatus({ type: "error", message: "Please enter a secret before generating a link." });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: null, message: "" });
    setGeneratedLink("");

    try {
      const password = generatePassword();
      const key = await importAesKey(password);
      const { encrypted, iv } = await encryptMessage(key, trimmedSecret);
      const salt = window.crypto.getRandomValues(new Uint8Array(16));

      const encryptedBase64 = toBase64(new Uint8Array(encrypted));
      const ivBase64 = toBase64(iv);
      const saltBase64 = toBase64(salt);

      const response = await fetch("/api/store-secret", {
        method: "POST",
        body: JSON.stringify({
          encrypted: encryptedBase64,
          iv: ivBase64,
          salt: saltBase64,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await safeParseJson(response);

      if (!response.ok) {
        const message = data?.error || "Failed to store the secret. Please try again.";
        throw new Error(message);
      }

      if (!data?.link) {
        throw new Error("Server did not return a secure link.");
      }

      const shareableLink = data.link;
      const clipboardSupported = Boolean(navigator?.clipboard?.writeText);

      try {
        if (!clipboardSupported) {
          throw new Error("Clipboard API is not available.");
        }

        await navigator.clipboard.writeText(shareableLink);
        setCopied(true);
        setStatus({ type: "success", message: "Secure link copied to clipboard." });
        setTimeout(() => setCopied(false), 5000);
      } catch (clipboardError) {
        console.warn("Failed to copy to clipboard", clipboardError);
        setCopied(false);
        setGeneratedLink(shareableLink);
        setStatus({
          type: "info",
          message: "Copy to clipboard failed. Use the link below to copy manually.",
        });
      }

      setSecret("");
    } catch (error) {
      console.error("Failed to create secure link", error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unexpected error. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={bodyStyle}>
      {showSecureLinkPage ? (
        <SecureLinkPage secretId={secretId} />
      ) : (
        <div style={contentWrapperStyle}>
          <h1 style={headerStyle}>
            Securely send and receive sensitive information
          </h1>
          <p style={subHeaderStyle}>
            Client-side encrypted one-time secrets since 2016
          </p>
          {status.message && (
            <p
              style={
                status.type === "error"
                  ? errorMessageStyle
                  : status.type === "success"
                  ? successMessageStyle
                  : infoMessageStyle
              }
            >
              {status.message}
            </p>
          )}
          <div style={cardStyle}>
            <div style={inputContainerStyle}>
              <input
                type="text"
                placeholder="Enter a secret here!"
                value={secret}
                onChange={handleSecretChange}
                style={inputStyle}
                disabled={isProcessing}
              />
              <button
                onClick={createSecureLink}
                style={getButtonStyle(isProcessing || !secret.trim())}
                disabled={isProcessing || !secret.trim()}
              >
                {isProcessing
                  ? "Creating..."
                  : copied
                  ? "Link copied!"
                  : "Create Secure Link"}
              </button>
            </div>
            {generatedLink && (
              <div style={manualCopyContainerStyle}>
                <label style={manualCopyLabelStyle}>Secure link</label>
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  style={manualCopyInputStyle}
                  onFocus={(event) => event.target.select()}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const bodyStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px",
  background: "linear-gradient(135deg, #f0f4ff 0%, #e0ecff 50%, #f9fcff 100%)",
};

const contentWrapperStyle = {
  maxWidth: "720px",
  width: "100%",
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

const cardStyle = {
  marginTop: "20px",
  padding: "30px",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  boxShadow: "0 20px 45px rgba(79, 114, 205, 0.18)",
};

const inputContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "15px",
};

const inputStyle = {
  padding: "30px",
  fontSize: "18px",
  borderRadius: "12px",
  border: "1px solid #d7ddf3",
  boxSizing: "border-box",
  width: "100%",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const buttonStyle = {
  padding: "16px 28px",
  background: "linear-gradient(135deg, #5a2dd4 0%, #7e62ff 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "600",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
  boxShadow: "0 12px 25px rgba(90, 45, 212, 0.25)",
  width: "100%",
};

const successMessageStyle = {
  color: "#2e7d32",
  marginBottom: "15px",
};

const errorMessageStyle = {
  color: "#c62828",
  marginBottom: "15px",
};

const infoMessageStyle = {
  color: "#2c3e50",
  marginBottom: "15px",
};

const manualCopyContainerStyle = {
  marginTop: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const manualCopyInputStyle = {
  width: "100%",
  maxWidth: "100%",
  padding: "16px",
  borderRadius: "10px",
  border: "1px solid #d7ddf3",
  fontSize: "16px",
  backgroundColor: "#f7f9ff",
  boxSizing: "border-box",
};

const manualCopyLabelStyle = {
  fontSize: "16px",
  fontWeight: "500",
};

const toBase64 = (bytes) => {
  return window.btoa(String.fromCharCode(...bytes));
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const getButtonStyle = (isDisabled) => ({
  ...buttonStyle,
  opacity: isDisabled ? 0.6 : 1,
  cursor: isDisabled ? "not-allowed" : "pointer",
  transform: isDisabled ? "none" : "translateY(0)",
});

export default Body;
