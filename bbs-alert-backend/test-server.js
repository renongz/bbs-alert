console.log("Starting test server...");

const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Server is running!"));

const PORT = 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
