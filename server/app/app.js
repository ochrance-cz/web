// Dependencies
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");

const rest = require("./rest");

const app = express();

// Certificate
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/search.ochrance.cz/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/search.ochrance.cz/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/search.ochrance.cz/chain.pem",
  "utf8"
);

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

app.use(cors());

app.get("/", (req, res) => {
  const options = {
    host: "localhost",
    port: 9200,
    path: `/ochrance-cs/_search?q=${encodeURIComponent(
      req.query.q
    )}&size=15&terminate_after=15&pretty`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  rest.getJSON(options, (statusCode, result) => {
    res.statusCode = statusCode;
    res.json(result);
  });
});

app.get("/cs/", (req, res) => {
  const options = {
    host: "localhost",
    port: 9200,
    path: `/ochrance-cs/_search?q=${encodeURIComponent(
      req.query.q
    )}&size=15&terminate_after=15&pretty`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  rest.getJSON(options, (statusCode, result) => {
    res.statusCode = statusCode;
    res.json(result);
  });
});

app.get("/en/", (req, res) => {
  const options = {
    host: "localhost",
    port: 9200,
    path: `/ochrance-en/_search?q=${encodeURIComponent(
      req.query.q
    )}&size=15&terminate_after=15&pretty`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  rest.getJSON(options, (statusCode, result) => {
    res.statusCode = statusCode;
    res.json(result);
  });
});

// Starting both http & https servers

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});

function exit(message) {
  if (message) console.log(message);
  httpsServer.close();
  process.exit();
}

process.on("exit", exit);
process.on("SIGINT", exit);
process.on("uncaughtException", exit);
