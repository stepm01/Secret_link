Secret Link
Secure Link is a full-stack application for exchanging one-time secrets. The client encrypts sensitive text locally in the browser before it ever leaves the user’s device. The server stores only the encrypted payload and exposes it exactly once via an expiring link.

Table of Contents
Features
Architecture
Prerequisites
Setup
Database
Available Scripts
API Reference
Security Notes
Roadmap
Features
End-to-end secrecy – secrets are encrypted with the Web Crypto API in the browser using AES-GCM; the server never sees plaintext.
One-time retrieval – every stored secret is marked as used after the first fetch to prevent replays.
Clipboard + fallback UX – generated links are copied automatically when possible, with a manual copy option when clipboard access is denied.
Responsive design – centered card layout with a modern gradient background keeps the experience polished on desktop and mobile.
Architecture
Browser (React) --encrypt--> Express API --persist--> PostgreSQL
                             ^        |
                             |        \-- returns retrieval link
                             \--decrypt (browser)
Client (client/): React application built with Create React App. Handles encryption, user interactions, and rendering of one-time links.
Server (server/): Express app that stores encrypted payloads, enforces single-use access, and serves the production client build.
Database: PostgreSQL database containing only opaque ciphertext (no plaintext secrets).
Prerequisites
Node.js 18+
npm 9+
PostgreSQL 13+
Setup
Clone the repository
git clone git@github.com:stepm01/Secret_link.git
cd Secret_link
Install dependencies
cd client && npm install
cd ../server && npm install
Configure database credentials
Update the Pool configuration in server/server.js to match your PostgreSQL settings. (Recommended: load these from environment variables.)
Create the secrets table (see Database).
Run the apps
Start the React dev server (defaults to port 3000):
cd client
npm start
Start the API server on a different port (e.g., 4000) in a new terminal:
cd server
PORT=4000 node server.js           # or: PORT=4000 npx nodemon server.js
Build for production
cd client
npm run build
The Express server serves the compiled assets from client/build in production.
Database
Create the backing table:

CREATE TABLE IF NOT EXISTS secrets (
  id         VARCHAR(32) PRIMARY KEY,
  encrypted  TEXT        NOT NULL,
  iv         TEXT        NOT NULL,
  salt       TEXT        NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Ensure the configured database (default name PasswordLink) exists and your credentials can read/write this table.

Available Scripts
Client (client/)
npm start – launch the CRA development server on port 3000.
npm run build – compile an optimized production build to client/build.
npm test – run Jest and React Testing Library suites.
Server (server/)
PORT=4000 node server.js – start the Express API (defaults to 3000 if PORT is unset).
PORT=4000 npx nodemon server.js – run with auto-reload during development.
API Reference
Method	Endpoint	Description
POST	/api/store-secret	Stores encrypted payload and returns the link
GET	/secret/:id	Returns encrypted payload for one-time use
POST /api/store-secret
Request body:

{
  "encrypted": "<base64 ciphertext>",
  "iv": "<base64 iv>",
  "salt": "<base64 salt>"
}
Response:

{
  "link": "https://your-host/secret/<id>"
}
GET /secret/:id

200 OK with { encrypted, iv, salt } when the secret is available.
404 Not Found if the identifier is unknown.
410 Gone if the secret was already retrieved.
Security Notes
Encryption happens entirely client-side. Anyone with the generated link can decrypt the secret, so share it carefully.
Secrets are marked as used immediately after retrieval; there is no retention window in the current implementation.
For production, replace hard-coded database credentials with environment variables and enforce HTTPS everywhere.
Consider automated secret expiry and auditing to meet compliance requirements.
Roadmap
Add configuration for secret expiry windows.
Introduce automated integration tests around the encryption/decryption flow.
Move runtime configuration (database, ports, etc.) into environment variables via dotenv or a similar solution.
