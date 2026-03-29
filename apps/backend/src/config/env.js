import dotenv from "dotenv";

dotenv.config();

const parsedCsvLimit = Number(process.env.CSV_MAX_FILE_SIZE_MB || 10);
const safeCsvLimitMb =
  Number.isFinite(parsedCsvLimit) && parsedCsvLimit > 0
    ? Math.min(parsedCsvLimit, 10)
    : 10;

export const env = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  csvMaxFileSizeMb: safeCsvLimitMb
};

