import React from "react";
import "./Modal.css";

function PanicModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🚨 Confirm Panic Alert</h2>
        <p>Are you sure you want to trigger a Panic Alert for all devices?</p>
        <div className="modal-buttons">
          <button className="panic" onClick={onConfirm}>Yes, Trigger</button>
          <button className="cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default PanicModal;
