# Secret Link

Secure Link is a full-stack application for exchanging one-time secrets. Sensitive text is encrypted in the browser before it leaves the user's device, ensuring the server persists only ciphertext. Recipients can view each secret exactly once through a time-limited link.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Database](#database)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)

## Features
- **End-to-end secrecy** – encrypts secrets in the browser using AES-GCM via the Web Crypto API; the server never sees plaintext.
- **One-time retrieval** – stored entries are flagged as used after the first successful fetch to prevent replays.
- **Clipboard-friendly UX** – automatically copies generated links when allowed, with a manual copy fallback when clipboard access is blocked.
- **Responsive polish** – centered card layout with gradient background keeps the experience clean on desktop and mobile.

## Architecture
```
Browser (React) --encrypt--> Express API --persist--> PostgreSQL
                             ^        |
                             |        \-- returns retrieval link
                             \--decrypt (browser)
```
- **Client** (`client/`): React app (Create React App) that manages encryption, user interactions, and link display.
- **Server** (`server/`): Express service that stores encrypted payloads, enforces single-use retrieval, and serves the built client.
- **Database**: PostgreSQL stores only ciphertext (`encrypted`, `iv`, `salt`, `used`).

## Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 13+

## Setup
1. **Clone the repository**
   ```bash
   git clone git@github.com:stepm01/Secret_link.git
   cd Secret_link
   ```

2. **Install dependencies**
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. **Configure database credentials**
   Update the `Pool` configuration in `server/server.js` to match your PostgreSQL instance. (Recommended: load settings from environment variables via `dotenv`.)

4. **Create the secrets table** (see [Database](#database)).

5. **Run the apps**
   - Start the React dev server (defaults to port 3000):
     ```bash
     cd client
     npm start
     ```
   - Start the API server on another port (example uses 4000) in a new terminal:
     ```bash
     cd server
     PORT=4000 node server.js          # or: PORT=4000 npx nodemon server.js
     ```

6. **Build for production**
   ```bash
   cd client
   npm run build
   ```
   The Express server serves static assets from `client/build` once the app is built.

## Database
Run the following SQL against your PostgreSQL database:
```sql
CREATE TABLE IF NOT EXISTS secrets (
  id         VARCHAR(32) PRIMARY KEY,
  encrypted  TEXT        NOT NULL,
  iv         TEXT        NOT NULL,
  salt       TEXT        NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Make sure the configured database (default name `PasswordLink`) exists and the supplied credentials can read/write this table.

## Available Scripts
### Client (`client/`)
- `npm start` – launch the CRA development server on port 3000.
- `npm run build` – generate an optimized production bundle in `client/build`.
- `npm test` – run Jest and React Testing Library suites.

### Server (`server/`)
- `PORT=4000 node server.js` – start the Express API (falls back to port 3000 if `PORT` is not set).
- `PORT=4000 npx nodemon server.js` – start the API with auto-reload for development.

## API Reference
| Method | Endpoint            | Description                                   |
|--------|---------------------|-----------------------------------------------|
| POST   | `/api/store-secret` | Stores encrypted payload and returns the link |
| GET    | `/secret/:id`       | Returns encrypted payload for one-time use    |

### POST `/api/store-secret`
Request body:
```json
{
  "encrypted": "<base64 ciphertext>",
  "iv": "<base64 iv>",
  "salt": "<base64 salt>"
}
```
Response:
```json
{
  "link": "https://your-host/secret/<id>"
}
```

### GET `/secret/:id`
- `200 OK` with `{ encrypted, iv, salt }` when the secret is available.
- `404 Not Found` if the identifier is unknown.
- `410 Gone` if the secret was previously retrieved.

## Security Notes
- Encryption runs entirely client-side. Anyone holding the generated URL can access the secret until it is consumed; share it carefully.
- Secrets are marked as `used` immediately after a successful fetch—no retention window is enforced.
- For production, move credentials into environment variables, enable HTTPS, and consider rate limiting and auditing.
- Additional hardening ideas include automatic expiration windows and optional password hints delivered out-of-band.

## Roadmap
- Configurable secret expiration and optional multi-use limits.
- Automated integration tests covering the encrypt/decrypt flow end-to-end.
- Deployment automation and environment-based configuration via `.env` files.

