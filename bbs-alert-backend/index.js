const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// ============================
// 🔹 Load Firebase credentials
// ============================
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json"); // for local dev
}

// Force correct projectId (fixes 404 /batch issue)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();
const tokensCol = db.collection("fcmTokens");
const alertsCol = db.collection("alerts");

// ============================
// 🔹 Express setup
// ============================
const app = express();
app.use(cors());
app.use(express.json());

// ============================
// 🔹 Save FCM token
// ============================
app.post("/register-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "No token provided" });

    await tokensCol.doc(token).set({ token, createdAt: Date.now() });
    console.log("✅ Token saved:", token);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving token:", err);
    res.status(500).json({ error: "Failed to save token" });
  }
});

// ============================
// 🔹 Send alert to all devices
// ============================
app.post("/send-alert", async (req, res) => {
  try {
    const { title, body } = req.body;

    // Save alert to Firestore
    await alertsCol.add({
      title,
      body,
      createdAt: Date.now(),
    });

    // Get all tokens
    const snapshot = await tokensCol.get();
    const tokens = snapshot.docs.map((doc) => doc.id);

    if (tokens.length === 0) {
      console.log("⚠️ No tokens found");
      return res.json({ success: false, message: "No tokens registered" });
    }

    // Send push notification
    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    console.log(`📢 Sending alert to ${tokens.length} devices...`);

    const response = await admin.messaging().sendMulticast(message);

    // Handle invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        invalidTokens.push(tokens[idx]);
      }
    });

    // Remove invalid tokens from Firestore
    if (invalidTokens.length > 0) {
      console.log("🗑 Removing invalid tokens:", invalidTokens);
      for (const t of invalidTokens) {
        await tokensCol.doc(t).delete();
      }
    }

    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (err) {
    console.error("🔥 Send-alert error:", err);
    res.status(500).json({ error: "Failed to send alert" });
  }
});

// ============================
// 🔹 Start server
// ============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`🔥 Using Firebase project: ${admin.app().options.projectId}`);
});
