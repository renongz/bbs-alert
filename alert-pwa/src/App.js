import React, { useEffect, useState, useCallback } from "react";
import { messaging, onMessage, getToken, deleteToken } from "./firebase";
import AlertList from "./AlertList";
import SuspiciousModal from "./SuspiciousModal";
import PanicModal from "./PanicModal";
import "./App.css";

const BACKEND_URL = "https://bbs-alert.onrender.com";
const VAPID_KEY = "BPbskm5kxi_HuNcE2bJN-M02JG2YV2mkZa-vhF_-saM";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [token, setToken] = useState(null);

  // Fetch alerts from backend
  const fetchAlerts = useCallback(() => {
    fetch(`${BACKEND_URL}/alerts`)
      .then((res) => res.json())
      .then((data) => {
        const backendAlerts = (data.items || []).map((item) => {
          const dateObj = item.createdAt ? new Date(item.createdAt) : new Date();
          return {
            title: item.title,
            body: item.body,
            date: dateObj.toLocaleDateString(),
            time: dateObj.toLocaleTimeString(),
            type: item.type,
          };
        });

        setAlerts((prev) => {
          const merged = [...backendAlerts, ...prev];
          const unique = merged.filter(
            (a, index, self) =>
              index === self.findIndex(
                (b) =>
                  a.title === b.title &&
                  a.body === b.body &&
                  a.date === b.date &&
                  a.time === b.time
              )
          );
          return unique.sort(
            (a, b) =>
              new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time)
          );
        });
      })
      .catch(console.error);
  }, []);

  // Handle incoming foreground messages
  const handleIncomingMessage = useCallback(
    (payload) => {
      const now = new Date();
      const type = payload.data?.type || "suspicious";

      const alertData = {
        title: payload.notification.title,
        body: payload.notification.body,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        type,
      };

      // Show notification in foreground
      if (Notification.permission === "granted") {
        new Notification(alertData.title, {
          body: alertData.body,
          icon: "/icon-192.png",
        });
      }

      // Play sound for panic alerts
      if (type === "panic" && soundOn) {
        const panicAudio = document.getElementById("panic-audio");
        if (panicAudio) {
          panicAudio.currentTime = 0;
          panicAudio.play().catch(() => {});
        }
      }

      // Add alert to state if not duplicate
      setAlerts((prev) => {
        const exists = prev.some(
          (a) =>
            a.title === alertData.title &&
            a.body === alertData.body &&
            a.date === alertData.date &&
            a.time === alertData.time
        );
        return exists ? prev : [alertData, ...prev];
      });
    },
    [soundOn]
  );

  // Initialize Firebase messaging and subscribe
  useEffect(() => {
    if (!("Notification" in window)) return;

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        getToken(messaging, { vapidKey: VAPID_KEY })
          .then((tok) => {
            if (tok) {
              setToken(tok);
              fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: tok, platform: "web" }),
              }).then(() => setSubscribed(true));
            }
          })
          .catch(console.error);
      }
    });

    const unsubscribeMessage = onMessage(messaging, handleIncomingMessage);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);

    return () => {
      clearInterval(interval);
      unsubscribeMessage(); // Cleanup
    };
  }, [fetchAlerts, handleIncomingMessage]);

  // Subscribe / Unsubscribe
  const handleSubscribe = async () => {
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform: "web" }),
      });
      setSubscribed(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsubscribe = async () => {
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      await deleteToken(messaging);
      setSubscribed(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Panic alert
  const handleTriggerPanic = () => {
    const alertData = { title: "🚨 Panic Alert", body: "🚨 Panic Alert!", type: "panic" };
    if (soundOn) {
      const panicAudio = document.getElementById("panic-audio");
      if (panicAudio) {
        panicAudio.currentTime = 0;
        panicAudio.play().catch(() => {});
      }
    }
    fetch(`${BACKEND_URL}/send-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    }).then(fetchAlerts);
    setShowPanicModal(false);
  };

  // Suspicious alert
  const sendSuspicious = (message) => {
    const alertData = { title: "⚠️ Suspicious Alert", body: message, type: "suspicious" };
    fetch(`${BACKEND_URL}/send-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    }).then(fetchAlerts);
    setShowModal(false);
  };

  const clearAlerts = () => {
    setAlerts([]);
    fetch(`${BACKEND_URL}/clear-alerts`, { method: "DELETE" });
  };

  return (
    <div className="container">
      <h1 className="title">🚨 Belvedere British School - Emergency Alert System</h1>
      <audio id="panic-audio" src="/panic.mp3" preload="auto" />

      <div className="button-box">
        <button className="panic" onClick={() => setShowPanicModal(true)}>
          🚨 Panic Alert
        </button>
        <div className="small-buttons">
          <button className="suspicious" onClick={() => setShowModal(true)}>
            ⚠️ Suspicious Alert
          </button>
          <button className="clear" onClick={clearAlerts}>
            🧹 Clear Alerts
          </button>
          <button onClick={() => setSoundOn(!soundOn)}>
            {soundOn ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>
          {subscribed ? (
            <button onClick={handleUnsubscribe}>❌ Unsubscribe</button>
          ) : (
            <button onClick={handleSubscribe}>✅ Subscribe</button>
          )}
        </div>
      </div>

      <AlertList alerts={alerts} />
      {showModal && <SuspiciousModal onSend={sendSuspicious} onClose={() => setShowModal(false)} />}
      {showPanicModal && <PanicModal onConfirm={handleTriggerPanic} onCancel={() => setShowPanicModal(false)} />}
    </div>
  );
}

export default App;
