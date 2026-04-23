import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SessionsClient } from "@google-cloud/dialogflow";

console.log("Starting Dialogflow server...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(cors()); // allow requests from your React frontend

// Initialize Dialogflow client
let client;
try {
  if (process.env.DIALOGFLOW_CLIENT_EMAIL && process.env.DIALOGFLOW_PRIVATE_KEY) {
    // Render / Production: use environment variables
    client = new SessionsClient({
      credentials: {
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      projectId: process.env.DIALOGFLOW_PROJECT_ID,
    });
    console.log("Dialogflow client initialized with environment variables.");
  } else {
    // Local development: use JSON file from env path or project directory.
    const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : null;
    const localKeyPath = path.resolve(__dirname, "solapur-heatguard-fdde-d44bfd41826a.json");
    const keyFilename = envKeyPath || localKeyPath;

    if (fs.existsSync(keyFilename)) {
      client = new SessionsClient({ keyFilename });
      console.log("Dialogflow client initialized with local JSON file:", keyFilename);
    } else {
      console.error("Dialogflow key file not found:", keyFilename);
      console.error("Set GOOGLE_APPLICATION_CREDENTIALS or place the JSON file beside server.js.");
    }
  }
} catch (err) {
  console.error("Failed to initialize Dialogflow client:", err);
  process.exit(1);
}

app.post("/api/dialogflow", async (req, res) => {
  const { text } = req.body;
  console.log("Received text:", text);

  if (!client) {
    return res.status(500).json({ reply: "Dialogflow is not configured on server." });
  }

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ reply: "Please send a valid text message." });
  }

  const sessionPath = client.projectAgentSessionPath(
    process.env.DIALOGFLOW_PROJECT_ID || "solapur-heatguard-fdde",
    "session-" + Date.now()
  );

  const request = {
    session: sessionPath,
    queryInput: {
        text: {
          text: text.trim(),
        languageCode: "en", // safer default
      },
    },
  };

  try {
    const responses = await client.detectIntent(request);
    const result = responses[0].queryResult;

    let reply = result.fulfillmentText || "";
    let suggestions = [];
    let links = [];

    if (result.fulfillmentMessages) {
      result.fulfillmentMessages.forEach(msg => {
        if (msg.text && msg.text.text.length > 0) {
          reply = msg.text.text[0];
        }
        if (msg.simpleResponses && msg.simpleResponses.simpleResponses.length > 0) {
          reply = msg.simpleResponses.simpleResponses[0].textToSpeech;
        }
        if (msg.suggestions && msg.suggestions.suggestions) {
          msg.suggestions.suggestions.forEach(opt => {
            if (opt.title) suggestions.push(opt.title);
          });
        }
        if (msg.linkOutSuggestion) {
          links.push({
            name: msg.linkOutSuggestion.destinationName,
            url: msg.linkOutSuggestion.uri
          });
        }
      });
    }

    console.log("Reply:", reply);
    console.log("Suggestions:", suggestions);
    console.log("Links:", links);

    res.json({ reply, suggestions, links });
  } catch (err) {
    console.error("Dialogflow error:", err); // log full error
    res.status(500).json({ reply: "Error contacting Dialogflow." });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});