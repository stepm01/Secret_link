import React, { useEffect, useState } from "react";
import { decryptPayload, extractKeyFromHash } from "../utils/crypto";

const SecureLinkPage = ({ secretId }) => {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState({
    type: "loading",
    message: "Loading secret...",
  });
  const [payload, setPayload] = useState(null);
  const [keyParams, setKeyParams] = useState({
    passwordBase64: "",
    passphraseSaltBase64: "",
    requiresPassphrase: false,
    passphraseHint: "",
  });
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const extractedParams = extractKeyFromHash();

    if (!extractedParams.passwordBase64) {
      setStatus({
        type: "error",
        message:
          "Missing decryption key. Make sure you copied the entire link including the #key fragment.",
      });
      return () => abortController.abort();
    }

    if (extractedParams.requiresPassphrase && !extractedParams.passphraseSaltBase64) {
      setStatus({
        type: "error",
        message:
          "Passphrase metadata is missing. Request a fresh link from the sender.",
      });
      return () => abortController.abort();
    }

    setKeyParams(extractedParams);

    const fetchSecret = async () => {
      try {
        const response = await fetch(`/secret/${secretId}`, {
          signal: abortController.signal,
        });
        const data = await safeParseJson(response);

        if (!response.ok) {
          if (response.status === 410 || data?.error === "Secret has already been used") {
            setStatus({
              type: "info",
              message: "This message has already been used and cannot be viewed again.",
            });
            return;
          }

          if (response.status === 404) {
            setStatus({
              type: "error",
              message: "Secret not found or it may have expired.",
            });
            return;
          }

          throw new Error(data?.error || "Failed to fetch secret.");
        }

        if (!data?.encrypted || !data?.iv || !data?.salt) {
          throw new Error("Server returned an incomplete payload.");
        }

        const fetchedPayload = {
          encrypted: data.encrypted,
          iv: data.iv,
          salt: data.salt,
        };

        setPayload(fetchedPayload);

        if (extractedParams.requiresPassphrase) {
          setStatus({
            type: "awaiting-passphrase",
            message: "Enter the passphrase to view the secret.",
          });
          return;
        }

        const decryptedSecret = await decryptPayload(
          fetchedPayload.encrypted,
          fetchedPayload.iv,
          fetchedPayload.salt,
          extractedParams.passwordBase64
        );

        if (!isMounted) {
          return;
        }

        setSecret(decryptedSecret);
        setStatus({ type: "ready", message: "" });

        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.name === "AbortError") {
          return;
        }

        console.error("Error fetching the secret:", error);

        if (
          error instanceof DOMException ||
          error?.name === "OperationError" ||
          error?.message?.toLowerCase().includes("decrypt")
        ) {
          setStatus({
            type: "error",
            message:
              "Failed to decrypt the secret. Ensure you are using the full, unmodified link that was generated.",
          });
          return;
        }

        setStatus({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected error retrieving the secret.",
        });
      }
    };

    fetchSecret();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [secretId]);

  const attemptDecrypt = async (passphraseInput) => {
    if (!payload) {
      return false;
    }

    if (!keyParams.passwordBase64) {
      setPassphraseError(
        "Missing decryption key metadata. Request a fresh link from the sender."
      );
      return false;
    }

    try {
      setIsDecrypting(true);
      const decryptedSecret = await decryptPayload(
        payload.encrypted,
        payload.iv,
        payload.salt,
        keyParams.passwordBase64,
        {
          passphrase: keyParams.requiresPassphrase ? passphraseInput : undefined,
          passphraseSaltBase64: keyParams.passphraseSaltBase64,
          requiresPassphrase: keyParams.requiresPassphrase,
        }
      );

      setSecret(decryptedSecret);
      setStatus({ type: "ready", message: "" });
      setPassphrase("");
      setPassphraseError("");

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      return true;
    } catch (error) {
      console.error("Failed to decrypt secret", error);

      if (error?.name === "AbortError") {
        return false;
      }

      setPassphraseError(
        error instanceof Error && error.message.includes("Passphrase")
          ? error.message
          : "Incorrect passphrase. Please try again."
      );
      setStatus({
        type: "awaiting-passphrase",
        message: "Enter the correct passphrase to view the secret.",
      });
      return false;
    } finally {
      setIsDecrypting(false);
    }
  };

  const handlePassphraseSubmit = async (event) => {
    event.preventDefault();
    if (!passphrase.trim() || isDecrypting) {
      return;
    }

    await attemptDecrypt(passphrase.trim());
  };

  const renderContent = () => {
    if (status.type === "loading") {
      return <p>{status.message}</p>;
    }

    if (status.type === "ready") {
      return (
        <div style={inputContainerStyle}>
          <textarea style={inputStyle} readOnly value={secret} />
        </div>
      );
    }

    if (status.type === "awaiting-passphrase") {
      return (
        <div style={passphraseGateStyle}>
          {status.message && <p style={infoTextStyle}>{status.message}</p>}
          {keyParams.passphraseHint && (
            <p style={passphraseHintStyle}>
              Hint: {keyParams.passphraseHint}
            </p>
          )}
          <form onSubmit={handlePassphraseSubmit} style={passphraseFormStyle}>
            <input
              type={showPassphrase ? "text" : "password"}
              value={passphrase}
              onChange={(event) => {
                setPassphraseError("");
                setPassphrase(event.target.value);
              }}
              placeholder="Enter passphrase"
              style={passphraseInputStyle}
              disabled={isDecrypting}
            />
            <label style={passphraseVisibilityLabelStyle}>
              <input
                type="checkbox"
                checked={showPassphrase}
                onChange={(event) => setShowPassphrase(event.target.checked)}
                disabled={isDecrypting}
              />
              Show passphrase
            </label>
            {passphraseError && <p style={passphraseErrorStyle}>{passphraseError}</p>}
            <button
              type="submit"
              style={passphraseSubmitStyle}
              disabled={!passphrase.trim() || isDecrypting}
            >
              {isDecrypting ? "Decrypting..." : "Decrypt secret"}
            </button>
          </form>
        </div>
      );
    }

    return <p>{status.message}</p>;
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>Your Secure Link</header>
      <main style={mainStyle}>{renderContent()}</main>
      <footer style={footerStyle}>
        <p>© 2024 Your Company - Secure Message</p>
      </footer>
    </div>
  );
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const pageStyle = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
};

const headerStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: "30px",
};

const mainStyle = {
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const inputContainerStyle = {
  width: "100%",
  maxWidth: "600px",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
};

const inputStyle = {
  width: "100%",
  padding: "20px",
  fontSize: "16px",
  height: "150px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  resize: "none",
  backgroundColor: "#f9f9f9",
};

const passphraseGateStyle = {
  width: "100%",
  maxWidth: "360px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  alignItems: "stretch",
};

const infoTextStyle = {
  fontSize: "16px",
  color: "#2c3e50",
  margin: 0,
};

const passphraseFormStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const passphraseHintStyle = {
  fontSize: "15px",
  color: "#4a5b8c",
  margin: 0,
};

const passphraseInputStyle = {
  padding: "14px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "1px solid #d0d7ec",
  outline: "none",
};

const passphraseVisibilityLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  color: "#2c3e50",
};

const passphraseErrorStyle = {
  color: "#c62828",
  fontSize: "14px",
  margin: 0,
};

const passphraseSubmitStyle = {
  padding: "14px",
  fontSize: "16px",
  backgroundColor: "#5a2dd4",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
};

const footerStyle = {
  textAlign: "center",
  marginTop: "20px",
};

export default SecureLinkPage;
