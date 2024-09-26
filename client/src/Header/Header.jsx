import React from "react";

const Header = () => {
  return (
    <header
      style={{
        backgroundColor: "#333",
        padding: "10px",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>PasswordLink</div>
      <nav>
        <a href="#about" style={navStyle}>
          About
        </a>
        <a href="#plans" style={navStyle}>
          Plans
        </a>
        <a href="#faq" style={navStyle}>
          FAQ
        </a>
        <a href="#custom" style={navStyle}>
          Custom Solution
        </a>
        <a href="#news" style={navStyle}>
          News
        </a>
        <a href="#support" style={navStyle}>
          Support
        </a>
      </nav>
    </header>
  );
};

const navStyle = {
  marginLeft: "20px",
  color: "#fff",
  textDecoration: "none",
};

export default Header;
