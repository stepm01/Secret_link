import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEncryptedPayload } from "../utils/crypto";

const PASS_PHRASE_NOTE = " Share the passphrase through a separate channel.";

const useSecureLink = () => {
  const [status, setStatus] = useState({ type: null, message: "" });
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkRequiresPassphrase, setLinkRequiresPassphrase] = useState(false);

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
    setLinkRequiresPassphrase(false);
  }, []);

  const createLink = useCallback(
    async (secret, options = {}) => {
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
      setLinkRequiresPassphrase(false);

      try {
        const {
          encryptedBase64,
          ivBase64,
          saltBase64,
          passwordBase64,
          passphraseSaltBase64,
          requiresPassphrase,
        } = await createEncryptedPayload(secret.trim(), {
          passphrase: options.passphrase,
        });

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

        const fragmentParams = new URLSearchParams();
        fragmentParams.set("key", passwordBase64);
        if (requiresPassphrase && passphraseSaltBase64) {
          fragmentParams.set("pps", passphraseSaltBase64);
          fragmentParams.set("pp", "1");
        }

        const shareableLink = `${data.link}#${fragmentParams.toString()}`;
        setGeneratedLink(shareableLink);
        setLinkRequiresPassphrase(requiresPassphrase);

        const passphraseNote = requiresPassphrase ? PASS_PHRASE_NOTE : "";

        if (clipboardSupported) {
          try {
            await navigator.clipboard.writeText(shareableLink);
            setCopied(true);
            setStatus({
              type: "success",
              message: `Secure link copied to clipboard.${passphraseNote}`,
            });

            copyResetTimeout.current = window.setTimeout(() => {
              setCopied(false);
              copyResetTimeout.current = null;
            }, 5000);
          } catch (clipboardError) {
            console.warn("Failed to copy to clipboard", clipboardError);
            setStatus({
              type: "info",
              message: `Copy to clipboard failed. Use the link below to copy manually.${passphraseNote}`,
            });
          }
        } else {
          setStatus({
            type: "info",
            message: `Copy to clipboard is unavailable. Use the link below to copy manually.${passphraseNote}`,
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
        setLinkRequiresPassphrase(false);
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
      const note = linkRequiresPassphrase ? PASS_PHRASE_NOTE : "";
      setStatus({ type: "success", message: `Secure link shared.${note}` });
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
  }, [generatedLink, linkRequiresPassphrase, shareSupported]);

  return {
    status,
    copied,
    generatedLink,
    isProcessing,
    clipboardSupported,
    shareSupported,
    linkRequiresPassphrase,
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
