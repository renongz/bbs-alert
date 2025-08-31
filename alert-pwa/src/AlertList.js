import React from "react";
import "./AlertList.css";

function AlertList({ alerts }) {
  if (!alerts || alerts.length === 0) return <p>No alerts yet.</p>;

  return (
    <div className="alert-table-wrapper">
      <table className="alert-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Title</th>
            <th>Body</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert, index) => (
            <tr key={index} className={alert.type==="panic"?"panic-row":""}>
              <td>{alert.date}</td>
              <td>{alert.time}</td>
              <td>{alert.type}</td>
              <td>{alert.title}</td>
              <td>{alert.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlertList;
