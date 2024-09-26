import React, { useEffect, useState } from "react";

const SecureLinkPage = ({ secretId }) => {
  const [secret, setSecret] = useState("");
  const [messageUsed, setMessageUsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecret = async () => {
      try {
        const response = await fetch(`/secret/${secretId}`);
        const data = await response.json();

        if (response.ok) {
          setSecret(atob(data.encrypted));
        } else if (response.status === 410 || data.error) {
          setMessageUsed(true);
        }
      } catch (error) {
        console.error("Error fetching the secret:", error);
        setMessageUsed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSecret();
  }, [secretId]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>Your Secure Link</header>
      <main style={mainStyle}>
        {loading ? (
          <p>Loading...</p>
        ) : messageUsed ? (
          <p>This message has already been used and cannot be viewed again.</p>
        ) : (
          <div style={inputContainerStyle}>
            <textarea style={inputStyle} readOnly value={secret} />
          </div>
        )}
      </main>
      <footer style={footerStyle}>
        <p>© 2024 Your Company - Secure Message</p>
      </footer>
    </div>
  );
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
