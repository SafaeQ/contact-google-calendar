
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { LocalStorage } = require("node-localstorage");
const localStorage = new LocalStorage('./scratch');

// Define the OAuth2 scopes required for the application.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

// Reads previously authorized credentials from the save file.
async function loadSavedCredentialsIfExist() {
  try {
    const content = localStorage.getItem('token');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// Serializes credentials to a file compatible with GoogleAuth.fromJSON.
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  localStorage.setItem('token', payload);
  // await fs.writeFile(TOKEN_PATH, payload);
}

// Load or request or authorization to call APIs.
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}


async function listEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = res.data.items;
  return events || [];
}

// Create an event on the user's primary calendar.
async function createEvent(eventData) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });
  const event = eventData
  const res = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
  return res.data;
}

const fetch = async (dataType = null) => {
  if (!dataType) {
    return null;
  }

  const authorizedClient = await authorize();

  switch (dataType) {
    case "events":
      return listEvents(authorizedClient);
    default:
      return null;
  }
};

module.exports = { fetch, createEvent };
