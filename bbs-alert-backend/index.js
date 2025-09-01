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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const tokensCol = db.collection("fcmTokens");
const alertsCol = db.collection("alerts");

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

    await tokensCol.doc(token).set(
      {
        token,
        platform: platform || "web",
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("📌 Token registered:", token);
    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unregister token
app.post("/unregister", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    await tokensCol.doc(token).delete();
    console.log("🗑️ Token unregistered:", token);
    res.json({ success: true, message: "Token unsubscribed successfully" });
  } catch (err) {
    console.error("🔥 Unregister error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send alert
app.post("/send-alert", async (req, res) => {
  const { title, body, type } = req.body;
  if (!title || !body || !type)
    return res.status(400).json({ error: "Missing title/body/type" });

  try {
    // Save alert
    const alertDoc = {
      title,
      body,
      type,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await alertsCol.add(alertDoc);

    // Get all tokens
    const snap = await tokensCol.get();
    const tokens = snap.docs.map((d) => d.id);

    if (!tokens.length) {
      console.log("⚠️ No tokens in Firestore. Skipping send.");
      return res.json({ success: false, message: "No tokens available" });
    }

    console.log(`📢 Sending alert to ${tokens.length} devices...`);

    // Send in chunks
    for (const group of chunk(tokens, 500)) {
      const response = await admin.messaging().sendMulticast({
        tokens: group,
        notification: { title, body },
        data: { type },
      });

      console.log(
        `📨 Sent to ${group.length} tokens → ✅ ${response.successCount} | ❌ ${response.failureCount}`
      );

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
    const snap = await alertsCol.orderBy("createdAt", "desc").limit(50).get();
    res.json({
      items: snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          body: data.body,
          type: data.type,
          createdAt: data.createdAt?.toDate().toISOString() || null,
        };
      }),
    });
  } catch (err) {
    console.error("🔥 Fetch alerts error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear alerts
app.delete("/clear-alerts", async (_req, res) => {
  try {
    const snap = await alertsCol.get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log("🧹 All alerts cleared");
    res.json({ success: true, message: "All alerts cleared" });
  } catch (err) {
    console.error("🔥 Clear alerts error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
