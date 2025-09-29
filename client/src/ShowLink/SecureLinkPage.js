import React, { useEffect, useState } from "react";
import { decryptPayload, extractKeyFromHash } from "../utils/crypto";

const SecureLinkPage = ({ secretId }) => {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState({
    type: "loading",
    message: "Loading secret...",
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const passwordFromHash = extractKeyFromHash();

    if (!passwordFromHash) {
      setStatus({
        type: "error",
        message:
          "Missing decryption key. Make sure you copied the entire link including the #key fragment.",
      });
      return () => abortController.abort();
    }

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

        const decryptedSecret = await decryptPayload(
          data.encrypted,
          data.iv,
          data.salt,
          passwordFromHash
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

        console.error("Error fetching the secret:", error);

        if (error?.name === "AbortError") {
          return;
        }

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

const footerStyle = {
  textAlign: "center",
  marginTop: "20px",
};

export default SecureLinkPage;
