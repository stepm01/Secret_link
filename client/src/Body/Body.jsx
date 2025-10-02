import React, { useEffect, useState } from "react";
import SecureLinkPage from "./ShowLink/SecureLinkPage";
import useSecureLink from "../hooks/useSecureLink";

const MIN_PASSPHRASE_LENGTH = 6;
const MAX_PASSPHRASE_HINT_LENGTH = 120;

const Body = () => {
  const [secret, setSecret] = useState("");
  const [showSecureLinkPage, setShowSecureLinkPage] = useState(false);
  const [secretId, setSecretId] = useState("");
  const [requirePassphrase, setRequirePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphraseHint, setPassphraseHint] = useState("");
  const [passphraseHintError, setPassphraseHintError] = useState("");
  const {
    status,
    copied,
    generatedLink,
    isProcessing,
    shareSupported,
    linkRequiresPassphrase,
    linkIncludesPassphraseHint,
    createLink,
    shareLink,
    resetFeedback,
  } = useSecureLink();

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

  const handleSecretChange = (event) => {
    if (status.type || generatedLink) {
      resetFeedback();
    }
    if (passphraseError) {
      setPassphraseError("");
    }
    if (passphraseHintError) {
      setPassphraseHintError("");
    }
    setSecret(event.target.value);
  };

  const handleRequirePassphraseChange = (event) => {
    const shouldRequirePassphrase = event.target.checked;
    setRequirePassphrase(shouldRequirePassphrase);
    setPassphraseError("");
    setPassphraseHintError("");

    if (shouldRequirePassphrase) {
      resetFeedback();
    } else {
      setPassphrase("");
      setPassphraseConfirm("");
      setPassphraseHint("");
    }
  };

  const handlePassphraseChange = (event) => {
    if (passphraseError) {
      setPassphraseError("");
    }
    setPassphrase(event.target.value);
  };

  const handlePassphraseConfirmChange = (event) => {
    if (passphraseError) {
      setPassphraseError("");
    }
    setPassphraseConfirm(event.target.value);
  };

  const handlePassphraseVisibilityChange = (event) => {
    setShowPassphrase(event.target.checked);
  };

  const handlePassphraseHintChange = (event) => {
    const nextValue = event.target.value;
    if (
      passphraseHintError &&
      nextValue.trim().length <= MAX_PASSPHRASE_HINT_LENGTH
    ) {
      setPassphraseHintError("");
    }
    setPassphraseHint(nextValue);
  };

  const handleCreateLink = async () => {
    if (isProcessing) {
      return;
    }

    let sanitizedPassphrase;
    let sanitizedHint = "";

    if (requirePassphrase) {
      const trimmedPassphrase = passphrase.trim();
      const trimmedConfirm = passphraseConfirm.trim();

      if (trimmedPassphrase.length < MIN_PASSPHRASE_LENGTH) {
        setPassphraseError(
          `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`
        );
        return;
      }

      if (trimmedPassphrase !== trimmedConfirm) {
        setPassphraseError("Passphrases do not match.");
        return;
      }

      sanitizedPassphrase = trimmedPassphrase;

      const trimmedHint = passphraseHint.trim();
      if (trimmedHint.length > MAX_PASSPHRASE_HINT_LENGTH) {
        setPassphraseHintError(
          `Passphrase hint must be ${MAX_PASSPHRASE_HINT_LENGTH} characters or less.`
        );
        return;
      }

      sanitizedHint = trimmedHint;
    } else if (passphraseHint) {
      setPassphraseHint("");
    }

    const createdLink = await createLink(secret, {
      passphrase: sanitizedPassphrase,
      passphraseHint: sanitizedHint,
    });

    if (createdLink) {
      setSecret("");
      if (requirePassphrase) {
        setPassphrase("");
        setPassphraseConfirm("");
        setPassphraseHint("");
        setPassphraseHintError("");
      }
    }
  };

  const handleShareClick = async () => {
    await shareLink();
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
              <div style={passphraseToggleRowStyle}>
                <label style={passphraseToggleLabelStyle}>
                  <input
                    type="checkbox"
                    checked={requirePassphrase}
                    onChange={handleRequirePassphraseChange}
                    disabled={isProcessing}
                  />
                  Require a passphrase to open this secret
                </label>
              </div>
              {requirePassphrase && (
                <div style={passphraseFieldsStyle}>
                  <input
                    type={showPassphrase ? "text" : "password"}
                    placeholder={`Passphrase (min ${MIN_PASSPHRASE_LENGTH} characters)`}
                    value={passphrase}
                    onChange={handlePassphraseChange}
                    style={passphraseInputStyle}
                    disabled={isProcessing}
                  />
                  <input
                    type={showPassphrase ? "text" : "password"}
                    placeholder="Confirm passphrase"
                    value={passphraseConfirm}
                    onChange={handlePassphraseConfirmChange}
                    style={passphraseInputStyle}
                    disabled={isProcessing}
                  />
                  <label style={passphraseVisibilityLabelStyle}>
                    <input
                      type="checkbox"
                      checked={showPassphrase}
                      onChange={handlePassphraseVisibilityChange}
                      disabled={isProcessing}
                    />
                    Show passphrase
                  </label>
                  <p style={passphraseHintStyle}>
                    Share the passphrase through a separate channel.
                  </p>
                  {passphraseError && (
                    <p style={passphraseErrorStyle}>{passphraseError}</p>
                  )}
                  <textarea
                    rows={2}
                    placeholder={`Optional hint for the recipient (${MAX_PASSPHRASE_HINT_LENGTH} characters max)`}
                    value={passphraseHint}
                    onChange={handlePassphraseHintChange}
                    style={passphraseHintInputStyle}
                    disabled={isProcessing}
                  />
                  <div style={passphraseHintFooterStyle}>
                    <span style={passphraseHintInfoStyle}>
                      This hint is attached to the link and visible to anyone who opens it.
                    </span>
                    <span style={passphraseHintCountStyle}>
                      {passphraseHint.trim().length}/{MAX_PASSPHRASE_HINT_LENGTH}
                    </span>
                  </div>
                  {passphraseHintError && (
                    <p style={passphraseHintErrorStyle}>{passphraseHintError}</p>
                  )}
                </div>
              )}
              <button
                onClick={handleCreateLink}
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
                {linkRequiresPassphrase && (
                  <p style={passphraseInfoNoteStyle}>
                    Requires the passphrase you set above.
                  </p>
                )}
                {linkIncludesPassphraseHint && (
                  <p style={passphraseInfoNoteStyle}>
                    Passphrase hint is included with this link and visible to the recipient.
                  </p>
                )}
                {shareSupported && (
                  <button
                    type="button"
                    onClick={handleShareClick}
                    style={shareButtonStyle}
                  >
                    Share Secure Link
                  </button>
                )}
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

const passphraseToggleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  marginTop: "8px",
};

const passphraseToggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "16px",
};

const passphraseFieldsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginTop: "12px",
};

const passphraseInputStyle = {
  padding: "16px",
  fontSize: "16px",
  borderRadius: "10px",
  border: "1px solid #d7ddf3",
  outline: "none",
  boxSizing: "border-box",
};

const passphraseVisibilityLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  color: "#2c3e50",
};

const passphraseHintStyle = {
  fontSize: "14px",
  color: "#4a5b8c",
  margin: 0,
};

const passphraseErrorStyle = {
  fontSize: "14px",
  color: "#c62828",
  margin: 0,
};

const passphraseHintInputStyle = {
  padding: "14px",
  fontSize: "15px",
  borderRadius: "10px",
  border: "1px solid #d7ddf3",
  outline: "none",
  resize: "vertical",
  minHeight: "60px",
};

const passphraseHintFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "13px",
  color: "#4a5b8c",
};

const passphraseHintInfoStyle = {
  marginRight: "12px",
};

const passphraseHintCountStyle = {
  fontVariantNumeric: "tabular-nums",
};

const passphraseHintErrorStyle = {
  fontSize: "14px",
  color: "#c62828",
  margin: 0,
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

const passphraseInfoNoteStyle = {
  fontSize: "14px",
  color: "#4a5b8c",
  margin: 0,
};

const shareButtonStyle = {
  marginTop: "12px",
  alignSelf: "flex-start",
  background: "transparent",
  border: "none",
  color: "#5a2dd4",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};

const getButtonStyle = (isDisabled) => ({
  ...buttonStyle,
  opacity: isDisabled ? 0.6 : 1,
  cursor: isDisabled ? "not-allowed" : "pointer",
  transform: isDisabled ? "none" : "translateY(0)",
});

export default Body;
