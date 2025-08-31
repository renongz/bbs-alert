const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Use the path to the secret outside Git
const serviceAccount = require(
  path.join("C:/Users/lenovo/Documents/BBS-backend-secret/serviceAccountKey.json")
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const tokensCol = db.collection("fcmTokens");
const alertsCol = db.collection("alerts");

// Helper to split tokens into chunks for FCM
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

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send alert (panic or suspicious)
app.post("/send-alert", async (req, res) => {
  const { title, body, type } = req.body;
  if (!title || !body || !type)
    return res.status(400).json({ error: "Missing title/body/type" });

  try {
    // Add alert to Firestore
    const alertDoc = {
      title,
      body,
      type,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await alertsCol.add(alertDoc);

    // Send push notification to all tokens
    const snap = await tokensCol.get();
    const tokens = snap.docs.map((d) => d.id);

    for (const group of chunk(tokens, 500)) {
      await admin.messaging().sendMulticast({
        tokens: group,
        notification: { title, body },
        data: { type },
      });
    }

    res.json({ success: true });
  } catch (err) {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all alerts
app.delete("/clear-alerts", async (_req, res) => {
  try {
    const snap = await alertsCol.get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true, message: "All alerts cleared" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(4000, () =>
  console.log("🚀 Backend running on http://localhost:4000")
);
