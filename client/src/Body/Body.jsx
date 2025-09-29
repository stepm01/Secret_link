import React, { useEffect, useState } from "react";
import SecureLinkPage from "./ShowLink/SecureLinkPage";
import useSecureLink from "../hooks/useSecureLink";

const Body = () => {
  const [secret, setSecret] = useState("");
  const [showSecureLinkPage, setShowSecureLinkPage] = useState(false);
  const [secretId, setSecretId] = useState("");
  const {
    status,
    copied,
    generatedLink,
    isProcessing,
    shareSupported,
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
    setSecret(event.target.value);
  };

  const handleCreateLink = async () => {
    if (isProcessing) {
      return;
    }

    const createdLink = await createLink(secret);
    if (createdLink) {
      setSecret("");
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
