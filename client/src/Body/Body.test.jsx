import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Body from "./Body";
import useSecureLink from "../hooks/useSecureLink";

jest.mock("../hooks/useSecureLink");

const setupHookMock = (overrides = {}) => {
  const defaultValues = {
    status: { type: null, message: "" },
    copied: false,
    generatedLink: "",
    isProcessing: false,
    shareSupported: false,
    linkRequiresPassphrase: false,
    linkIncludesPassphraseHint: false,
    createLink: jest.fn().mockResolvedValue("https://example.com"),
    shareLink: jest.fn(),
    resetFeedback: jest.fn(),
  };

  const hookValues = { ...defaultValues, ...overrides };
  useSecureLink.mockReturnValue(hookValues);
  return hookValues;
};

describe("Body", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("enables secure link generation only after a secret is entered", async () => {
    setupHookMock();

    render(<Body />);

    const createButton = screen.getByRole("button", { name: /create secure link/i });
    expect(createButton).toBeDisabled();

    const input = screen.getByPlaceholderText(/enter a secret here/i);
    await userEvent.type(input, "Test secret");

    expect(createButton).toBeEnabled();
  });

  test("shows and validates passphrase controls when enabled", async () => {
    const hookValues = setupHookMock({
      createLink: jest.fn().mockResolvedValue("https://example.com/secret"),
    });

    render(<Body />);

    const passphraseToggle = screen.getByLabelText(/require a passphrase/i);
    await userEvent.click(passphraseToggle);

    const passphraseInput = screen.getByPlaceholderText(/passphrase \(min/i);
    const passphraseConfirm = screen.getByPlaceholderText(/confirm passphrase/i);

    await userEvent.type(passphraseInput, "short");
    await userEvent.type(passphraseConfirm, "short");

    const secretInput = screen.getByPlaceholderText(/enter a secret here/i);
    await userEvent.type(secretInput, "Secret with passphrase");

    const createButton = screen.getByRole("button", { name: /create secure link/i });
    await userEvent.click(createButton);

    expect(await screen.findByText(/passphrase must be at least/i)).toBeInTheDocument();
    expect(hookValues.createLink).not.toHaveBeenCalled();

    await userEvent.clear(passphraseInput);
    await userEvent.clear(passphraseConfirm);
    await userEvent.type(passphraseInput, "longpass");
    await userEvent.type(passphraseConfirm, "mismatch");

    await userEvent.click(createButton);
    expect(await screen.findByText(/passphrases do not match/i)).toBeInTheDocument();
    expect(hookValues.createLink).not.toHaveBeenCalled();

    await userEvent.clear(passphraseConfirm);
    await userEvent.type(passphraseConfirm, "longpass");

    const hintInput = screen.getByPlaceholderText(/optional hint/i);
    await userEvent.type(hintInput, "a".repeat(121));

    await userEvent.click(createButton);
    expect(await screen.findByText(/passphrase hint must be/i)).toBeInTheDocument();
    expect(hookValues.createLink).not.toHaveBeenCalled();
  });

  test("submits passphrase-protected secret when validation passes", async () => {
    const hookValues = setupHookMock({
      createLink: jest.fn().mockResolvedValue("https://example.com/secret"),
    });

    render(<Body />);

    await userEvent.type(screen.getByPlaceholderText(/enter a secret here/i), "Secret body");

    await userEvent.click(screen.getByLabelText(/require a passphrase/i));

    const passphraseInput = screen.getByPlaceholderText(/passphrase \(min/i);
    const passphraseConfirm = screen.getByPlaceholderText(/confirm passphrase/i);

    await userEvent.type(passphraseInput, "trustedpass");
    await userEvent.type(passphraseConfirm, "trustedpass");
    await userEvent.type(
      screen.getByPlaceholderText(/optional hint/i),
      "Remember the color"
    );

    await userEvent.click(screen.getByRole("button", { name: /create secure link/i }));

    await waitFor(() => {
      expect(hookValues.createLink).toHaveBeenCalledWith("Secret body", {
        passphrase: "trustedpass",
        passphraseHint: "Remember the color",
      });
    });
  });
});
