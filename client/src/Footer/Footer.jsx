import React from "react";

const Footer = () => {
  return (
    <footer style={footerStyle}>
      <div
        style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px" }}
      >
        PasswordLink
      </div>
      <div>
        <a href="#terms" style={linkStyle}>
          Terms of Service
        </a>
        <a href="#privacy" style={linkStyle}>
          Privacy Policy
        </a>
        <a href="#gdpr" style={linkStyle}>
          GDPR Compliance
        </a>
        <a href="#legal" style={linkStyle}>
          Legal Notice
        </a>
      </div>
    </footer>
  );
};

const footerStyle = {
  backgroundColor: "#333",
  padding: "20px",
  color: "#fff",
  textAlign: "center",
  position: "fixed",
  left: 0,
  bottom: 0,
  width: "100%",
};

const linkStyle = {
  margin: "0 10px",
  color: "#fff",
  textDecoration: "none",
  display: "inline-block",
};

export default Footer;
