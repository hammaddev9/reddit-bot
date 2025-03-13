require("dotenv").config();
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const CREDENTIALS_PATH = "./google-credentials.json";

const sheets = google.sheets({
  version: "v4",
  auth: new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  }),
});

async function getSheetData(spreadsheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values ? response.data.values.flat() : [];
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error.message);
    return [];
  }
}

async function loadGoogleSheetsData() {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  const subreddits = await getSheetData(SPREADSHEET_ID, "Subreddits!A:A");
  const keywords = await getSheetData(SPREADSHEET_ID, "Keywords!A:A");

  console.log(`Loaded ${subreddits.length} subreddits and ${keywords.length} keywords.`);

  return { subreddits, keywords };
}

module.exports = { loadGoogleSheetsData };
