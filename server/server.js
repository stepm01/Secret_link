const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "PasswordLink",
  password: "642095",
  port: 5432,
});

pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../client/build")));

app.post("/api/store-secret", async (req, res) => {
  const { encrypted, iv, salt } = req.body;
  const secretId = crypto.randomBytes(16).toString("hex");

  try {
    await pool.query(
      "INSERT INTO secrets (id, encrypted, iv, salt, used) VALUES ($1, $2, $3, $4, false)",
      [secretId, encrypted, iv, salt]
    );
    const link = `${req.protocol}://${req.get("host")}/secret/${secretId}`;
    res.json({ link });
  } catch (err) {
    console.error("Error storing secret:", err);
    res.status(500).json({ error: "Failed to store secret" });
  }
});

app.get("/secret/:id", async (req, res) => {
  const secretId = req.params.id;

  try {
    const result = await pool.query(
      "SELECT encrypted, iv, salt, used FROM secrets WHERE id = $1",
      [secretId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Secret not found" });
    }

    const { encrypted, iv, salt, used } = result.rows[0];

    if (used) {
      return res.status(410).json({ error: "Secret has already been used" });
    }

    await pool.query("UPDATE secrets SET used = true WHERE id = $1", [
      secretId,
    ]);

    res.json({ encrypted, iv, salt });
  } catch (err) {
    console.error("Error fetching secret:", err);
    res.status(500).json({ error: "Failed to fetch secret" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
