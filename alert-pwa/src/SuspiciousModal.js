import React, { useState } from "react";
import "./Modal.css";

function SuspiciousModal({ onSend, onClose }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() === "") return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>⚠️ Send Suspicious Alert</h2>
        <textarea
          placeholder="Enter alert message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="modal-buttons">
          <button className="send" onClick={handleSend}>Send</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default SuspiciousModal;
