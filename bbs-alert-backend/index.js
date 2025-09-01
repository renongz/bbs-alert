const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// Load Firebase service account (Render ENV or local file)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

// Initialize Firebase Realtime Database
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bbs-alert-default-rtdb.firebaseio.com" // <-- Replace with your RTDB URL
});

const db = admin.database();
const tokensRef = db.ref("fcmTokens");
const alertsRef = db.ref("alerts");

// Helper: split array into chunks
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Health check
app.get("/", (_req, res) => res.send("✅ Backend running"));

// Register device token
app.post("/register", async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    await tokensRef.child(token).set({
      token,
      platform: platform || "web",
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });

    console.log("📌 Token registered:", token);
    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unregister device token
app.post("/unregister", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    await tokensRef.child(token).remove();
    console.log("🗑️ Token unregistered:", token);
    res.json({ success: true, message: "Token unsubscribed successfully" });
  } catch (err) {
    console.error("🔥 Unregister error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send alert to devices
app.post("/send-alert", async (req, res) => {
  const { title, body, type } = req.body;
  if (!title || !body || !type)
    return res.status(400).json({ error: "Missing title/body/type" });

  try {
    // Save alert to Realtime Database
    const alertData = { title, body, type, createdAt: Date.now() };
    const newAlertRef = alertsRef.push();
    await newAlertRef.set(alertData);

    // Get all tokens
    const tokensSnap = await tokensRef.once("value");
    const tokensObj = tokensSnap.val() || {};
    const tokens = Object.keys(tokensObj);

    if (!tokens.length) {
      console.log("⚠️ No tokens in database. Skipping send.");
      return res.json({ success: false, message: "No tokens available" });
    }

    console.log(`📢 Sending alert to ${tokens.length} devices...`);

    // Send in chunks of 500
    for (const group of chunk(tokens, 500)) {
      const response = await admin.messaging().sendMulticast({
        tokens: group,
        notification: { title, body },
        data: { type },
      });

      console.log(`📨 Sent: ✅ ${response.successCount} | ❌ ${response.failureCount}`);
      response.responses.forEach((r, i) => {
        if (!r.success) {
          console.error("❌ Failed token:", group[i], r.error?.message);
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Send-alert error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch last 50 alerts
app.get("/alerts", async (_req, res) => {
  try {
    const snap = await alertsRef.orderByChild("createdAt").limitToLast(50).once("value");
    const alertsObj = snap.val() || {};
    const alerts = Object.values(alertsObj)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(a => ({
        title: a.title,
        body: a.body,
        date: new Date(a.createdAt).toLocaleDateString(),
        time: new Date(a.createdAt).toLocaleTimeString(),
        type: a.type,
      }));
    res.json({ items: alerts });
  } catch (err) {
    console.error("🔥 Fetch alerts error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all alerts
app.delete("/clear-alerts", async (_req, res) => {
  try {
    await alertsRef.remove();
    console.log("🧹 All alerts cleared");
    res.json({ success: true, message: "All alerts cleared" });
  } catch (err) {
    console.error("🔥 Clear alerts error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
