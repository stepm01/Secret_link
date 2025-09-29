import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEncryptedPayload } from "../utils/crypto";

const useSecureLink = () => {
  const [status, setStatus] = useState({ type: null, message: "" });
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const clipboardSupported = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    return Boolean(navigator.clipboard?.writeText);
  }, []);

  const shareSupported = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    return typeof navigator.share === "function";
  }, []);

  const copyResetTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  const resetFeedback = useCallback(() => {
    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = null;
    }

    setStatus({ type: null, message: "" });
    setCopied(false);
    setGeneratedLink("");
  }, []);

  const createLink = useCallback(
    async (secret) => {
      if (!secret.trim()) {
        setStatus({
          type: "error",
          message: "Please enter a secret before generating a link.",
        });
        return null;
      }

      setIsProcessing(true);
      setStatus({ type: null, message: "" });
      setCopied(false);
      setGeneratedLink("");

      try {
        const {
          encryptedBase64,
          ivBase64,
          saltBase64,
          passwordBase64,
        } = await createEncryptedPayload(secret.trim());

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

        const shareableLink = `${data.link}#key=${encodeURIComponent(
          passwordBase64
        )}`;
        setGeneratedLink(shareableLink);

        if (clipboardSupported) {
          try {
            await navigator.clipboard.writeText(shareableLink);
            setCopied(true);
            setStatus({
              type: "success",
              message: "Secure link copied to clipboard.",
            });

            copyResetTimeout.current = window.setTimeout(() => {
              setCopied(false);
              copyResetTimeout.current = null;
            }, 5000);
          } catch (clipboardError) {
            console.warn("Failed to copy to clipboard", clipboardError);
            setStatus({
              type: "info",
              message: "Copy to clipboard failed. Use the link below to copy manually.",
            });
          }
        } else {
          setStatus({
            type: "info",
            message: "Copy to clipboard is unavailable. Use the link below to copy manually.",
          });
        }

        return shareableLink;
      } catch (error) {
        console.error("Failed to create secure link", error);
        setStatus({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unexpected error. Please try again.",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [clipboardSupported]
  );

  const shareLink = useCallback(async () => {
    if (!shareSupported || !generatedLink) {
      return false;
    }

    try {
      await navigator.share({
        title: "Secure Link",
        text: "One-time secret link",
        url: generatedLink,
      });
      setStatus({ type: "success", message: "Secure link shared." });
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus({ type: "info", message: "Share cancelled." });
        return false;
      }
      console.warn("Failed to share link", error);
      setStatus({ type: "error", message: "Unable to share link on this device." });
      return false;
    }
  }, [generatedLink, shareSupported]);

  return {
    status,
    setStatus,
    copied,
    generatedLink,
    isProcessing,
    clipboardSupported,
    shareSupported,
    createLink,
    shareLink,
    resetFeedback,
  };
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export default useSecureLink;
