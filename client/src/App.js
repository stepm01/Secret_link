import React, { useEffect, useState } from "react";
import Body from "./Body/Body";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import SecureLinkPage from "./ShowLink/SecureLinkPage";

function App() {
  const [secret, setSecret] = useState(null);
  const [isUsed, setIsUsed] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/secret/")) {
      const secretId = path.split("/")[2];
      fetch(`/secret/${secretId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setIsUsed(true);
          } else {
            setSecret(atob(data.encrypted));
          }
        });
    }
  }, []);

  return (
    <div>
      <Header />
      {secret ? (
        <div>
          <h1>Your Decrypted Secret</h1>
          <p>{secret}</p>
        </div>
      ) : isUsed ? (
        <p>The message has been used already.</p>
      ) : (
        <Body />
      )}
      <Footer />
    </div>
  );
}

export default App;
