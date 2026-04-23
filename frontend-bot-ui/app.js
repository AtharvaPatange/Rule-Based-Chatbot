const statusEl = document.getElementById("statusText");
const messagesEl = document.getElementById("messages");
const chipsEl = document.getElementById("chips");
const chatFormEl = document.getElementById("chatForm");
const messageInputEl = document.getElementById("messageInput");
const clearChatBtnEl = document.getElementById("clearChatBtn");
const sendBtnEl = document.getElementById("sendBtn");

const apiBaseUrl =
  window.HEATGUARD_CONFIG?.API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:5000";
const apiEndpoint = `${apiBaseUrl}/api/dialogflow`;

let requestInFlight = false;

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "error");
  if (kind) {
    statusEl.classList.add(kind);
  }
}

function appendMessage(role, text) {
  const bubble = document.createElement("article");
  bubble.className = `message ${role}`;

  const body = document.createElement("div");
  body.textContent = text;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = role === "bot" ? `HeatGuard • ${nowTime()}` : `You • ${nowTime()}`;

  bubble.append(body, meta);
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSuggestions(suggestions = []) {
  chipsEl.innerHTML = "";
  suggestions.slice(0, 6).forEach((label) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = label;
    chip.addEventListener("click", () => {
      messageInputEl.value = label;
      sendMessage(label);
    });
    chipsEl.appendChild(chip);
  });
}

function setComposerEnabled(isEnabled) {
  requestInFlight = !isEnabled;
  sendBtnEl.disabled = !isEnabled;
  messageInputEl.disabled = !isEnabled;
}

async function sendMessage(rawText) {
  const text = (rawText || "").trim();
  if (!text || requestInFlight) return;

  appendMessage("user", text);
  messageInputEl.value = "";
  renderSuggestions([]);
  setComposerEnabled(false);
  setStatus("Talking to backend...", "");

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.reply || `Request failed (${response.status})`);
    }

    const reply = payload?.reply || "I did not get a response from Dialogflow.";
    appendMessage("bot", reply);

    if (Array.isArray(payload?.suggestions)) {
      renderSuggestions(payload.suggestions);
    }

    if (Array.isArray(payload?.links) && payload.links.length) {
      payload.links.forEach((link) => {
        if (link?.name && link?.url) {
          appendMessage("bot", `${link.name}: ${link.url}`);
        }
      });
    }

    setStatus("Connected", "ok");
  } catch (error) {
    appendMessage("bot", `Error: ${error.message}`);
    setStatus("Connection issue", "error");
  } finally {
    setComposerEnabled(true);
    messageInputEl.focus();
  }
}

chatFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(messageInputEl.value);
});

clearChatBtnEl.addEventListener("click", () => {
  messagesEl.innerHTML = "";
  renderSuggestions([]);
  appendMessage("bot", "Namaste! Welcome to Solapur HeatGuard. Ask me anything about summer safety.");
  setStatus("Connected", "ok");
  messageInputEl.focus();
});

appendMessage("bot", "Namaste! Welcome to Solapur HeatGuard. Ask me anything about summer safety.");
setStatus(`Ready: ${apiEndpoint}`, "ok");
