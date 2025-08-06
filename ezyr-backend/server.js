const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const blockConfigs = require("./blockConfigs");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Strip zero-width and trim whitespace
 */
const stripZeroWidth = (s) =>
  s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

// OAUTH CALLBACK (for Google)
app.post("/oauth/callback", async (req, res) => {
  const { code, redirect_uri, client_id, client_secret } = req.body;

  if (!code || !redirect_uri) {
    return res
      .status(400)
      .json({ error: "Missing authorization code or redirect_uri" });
  }

  let clientId = typeof client_id === "string" ? stripZeroWidth(client_id) : null;
  let clientSecret = typeof client_secret === "string" ? stripZeroWidth(client_secret) : null;

  if (!clientId || !clientSecret) {
    return res
      .status(400)
      .json({ error: "Missing client_id or client_secret in request body" });
  }

  try {
    const { google } = require("googleapis");
    const authClient = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirect_uri
    );
    const { tokens } = await authClient.getToken(code);

    return res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date || Date.now() + 3600 * 1000,
      token_type: tokens.token_type || "Bearer",
    });
  } catch (err) {
    console.error("OAuth exchange failed:", err);
    return res
      .status(400)
      .json({ error: "OAuth exchange failed", details: err.message });
  }
});

// OAUTH REFRESH
app.post("/oauth/refresh", async (req, res) => {
  const { refresh_token, client_id, client_secret } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Missing refresh_token" });
  }

  let clientId = typeof client_id === "string" ? stripZeroWidth(client_id) : null;
  let clientSecret = typeof client_secret === "string" ? stripZeroWidth(client_secret) : null;

  if (!clientId || !clientSecret) {
    return res
      .status(400)
      .json({ error: "Missing client_id or client_secret in request body" });
  }

  try {
    const { google } = require("googleapis");
    const authClient = new google.auth.OAuth2(clientId, clientSecret);
    authClient.setCredentials({ refresh_token });
    const { credentials } = await authClient.refreshAccessToken();

    return res.json({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refresh_token,
      expires_at: credentials.expiry_date || Date.now() + 3600 * 1000,
      token_type: credentials.token_type || "Bearer",
    });
  } catch (err) {
    console.error("Token refresh failed:", err);
    return res.status(400).json({
      error: "Token refresh failed",
      details: err.message,
      requiresReauth: true,
    });
  }
});


function isTokenExpired(tokenData) {
  if (!tokenData.expires_at) return false;
  const bufferTime = 5 * 60 * 1000;
  return Date.now() > tokenData.expires_at - bufferTime;
}

// GENERIC BLOCK EXECUTION ENDPOINT
app.post("/block/execute", async (req, res) => {
  console.log('/block/execute reacht to here');

  try {
    const { blockId, operation, params = {}, credentials = {} } = req.body;
    const block = blockConfigs[blockId];
    if (!block) return res.status(400).json({ error: "Block not found" });
    const op = block.operations[operation];
    if (!op) return res.status(400).json({ error: "Operation not found" });
    if (op.execute) {
      // Internal handler (for Google APIs)
      if (!credentials.clientId && credentials.client_id) credentials.clientId = credentials.client_id;
      if (!credentials.secretId && credentials.client_secret) credentials.secretId = credentials.client_secret;
      if (!credentials.access_token) credentials.access_token = credentials.accessToken;

      // ✅ Add this
      if (!params.spreadsheetId && credentials.spreadsheetId) {
        params.spreadsheetId = credentials.spreadsheetId;
      }

      // Provide dataFields/valuesArray compatibility for sheets/airtable.
      params.dataFields = params.dataFields || params.fields || params;
      params.valuesArray = params.valuesArray || Object.values(params.dataFields || params);

      // Call
      const result = await op.execute({ credentials, inputs: params });
      return res.json(result);
    }

    console.log('op', op);

    // For REST blocks (like Airtable)
    // Required fields
    if (op.requiredFields && op.requiredFields.some(f => !params[f]))
      return res.status(400).json({ error: "Missing required fields" });

    // URL, Payload, Headers
    const config = block.config || {};
    const url = op.buildUrl({ inputs: params, config });
    const headers = op.buildHeaders({ credentials });
    let payload = undefined;
    if (op.buildPayload) payload = op.buildPayload({ inputs: params });

    const method = op.method.toLowerCase();
    let axiosConfig = { url, method, headers, data: payload };

    // Remove empty data on GET/DELETE
    if (!payload && (method === "get" || method === "delete")) delete axiosConfig.data;

    // Execute request
    const response = await axios(axiosConfig);

    let out = response.data;
    if (op.responseField) out = out[op.responseField];
    if (op.transform) out = op.transform(out);

    return res.json(out);
  } catch (err) {
    console.error("Block execution error:", err);
    res.status(500).json({ error: err.message || "Block execution failed" });
  }
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
