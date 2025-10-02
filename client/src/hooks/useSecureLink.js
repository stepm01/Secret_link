import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEncryptedPayload } from "../utils/crypto";

const PASS_PHRASE_NOTE = "Share the passphrase through a separate channel.";
const PASS_PHRASE_HINT_NOTE = "Any hint you add is visible to anyone with the link.";

const useSecureLink = () => {
  const [status, setStatus] = useState({ type: null, message: "" });
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkRequiresPassphrase, setLinkRequiresPassphrase] = useState(false);
  const [linkIncludesPassphraseHint, setLinkIncludesPassphraseHint] = useState(false);

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
    setLinkIncludesPassphraseHint(false);
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

        const trimmedPassphraseHint = options.passphraseHint
          ? options.passphraseHint.trim()
          : "";

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
          if (trimmedPassphraseHint) {
            fragmentParams.set("hint", trimmedPassphraseHint);
          }
        }

        const shareableLink = `${data.link}#${fragmentParams.toString()}`;
        setGeneratedLink(shareableLink);
        setLinkRequiresPassphrase(requiresPassphrase);
        setLinkIncludesPassphraseHint(Boolean(trimmedPassphraseHint));

        const notes = [];
        if (requiresPassphrase) {
          notes.push(PASS_PHRASE_NOTE);
        }
        if (trimmedPassphraseHint) {
          notes.push(PASS_PHRASE_HINT_NOTE);
        }
        const supplementalNote = notes.length ? ` ${notes.join(" ")}` : "";

        if (clipboardSupported) {
          try {
            await navigator.clipboard.writeText(shareableLink);
            setCopied(true);
            setStatus({
              type: "success",
              message: `Secure link copied to clipboard.${supplementalNote}`,
            });

            copyResetTimeout.current = window.setTimeout(() => {
              setCopied(false);
              copyResetTimeout.current = null;
            }, 5000);
          } catch (clipboardError) {
            console.warn("Failed to copy to clipboard", clipboardError);
            setStatus({
              type: "info",
              message: `Copy to clipboard failed. Use the link below to copy manually.${supplementalNote}`,
            });
          }
        } else {
          setStatus({
            type: "info",
            message: `Copy to clipboard is unavailable. Use the link below to copy manually.${supplementalNote}`,
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
        setLinkIncludesPassphraseHint(false);
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
      const notePieces = [];
      if (linkRequiresPassphrase) {
        notePieces.push(PASS_PHRASE_NOTE);
      }
      if (linkIncludesPassphraseHint) {
        notePieces.push(PASS_PHRASE_HINT_NOTE);
      }
      const note = notePieces.length ? ` ${notePieces.join(" ")}` : "";
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
  }, [generatedLink, linkIncludesPassphraseHint, linkRequiresPassphrase, shareSupported]);

  return {
    status,
    copied,
    generatedLink,
    isProcessing,
    clipboardSupported,
    shareSupported,
    linkRequiresPassphrase,
    linkIncludesPassphraseHint,
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
