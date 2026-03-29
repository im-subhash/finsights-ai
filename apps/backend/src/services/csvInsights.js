import { GoogleGenerativeAI } from "@google/generative-ai";
import { parse } from "csv-parse/sync";
import { PDFParse } from "pdf-parse";

const inrFormatter = new Intl.NumberFormat("en-IN");
const normalizedCategoryMap = {
  food: "Dining",
  restaurant: "Dining",
  grocery: "Groceries",
  groceries: "Groceries",
  medical: "Healthcare",
  health: "Healthcare",
  travel: "Transport",
  transport: "Transport",
  utility: "Utilities",
  utilities: "Utilities",
  education: "Education",
  shopping: "Shopping",
  income: "Income",
  entertainment: "Entertainment",
  transfer: "Transfers",
  transfers: "Transfers",
  banking: "Banking",
  others: "Others",
  misc: "Others",
  miscellaneous: "Others"
};

function toNumber(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getByAliases(row, aliases) {
  const entries = Object.entries(row || {});
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
    if (aliases.some((alias) => normalizedKey.includes(alias))) {
      return value;
    }
  }
  return "";
}

function inferType(row) {
  const explicitType = String(
    getByAliases(row, ["transactiontype", "type", "drcr", "debitcredit", "creditdebit"])
  ).toLowerCase();

  if (explicitType.includes("debit") || explicitType === "dr" || explicitType === "d") {
    return "debit";
  }
  if (explicitType.includes("credit") || explicitType === "cr" || explicitType === "c") {
    return "credit";
  }

  const debitValue = toNumber(getByAliases(row, ["debit", "withdrawal", "paid"]));
  const creditValue = toNumber(getByAliases(row, ["credit", "deposit", "received"]));
  if (debitValue > 0 && creditValue === 0) return "debit";
  if (creditValue > 0 && debitValue === 0) return "credit";

  return "unknown";
}

function inferTypeFromText(text = "") {
  const normalized = String(text).toLowerCase();
  if (/\b(debit|debited|spent|paid|purchase|dr)\b/.test(normalized)) return "debit";
  if (/\b(credit|credited|received|refund|cr)\b/.test(normalized)) return "credit";
  return "unknown";
}

function inferCategoryFromText(text = "") {
  const normalized = String(text).toLowerCase();
  if (/(zomato|swiggy|restaurant|dining|food|cafe|tea|mezbaan|snack|diner)/.test(normalized)) return "Dining";
  if (/(grocery|supermarket|mart|aashirwad enter|traders|24buy7)/.test(normalized)) return "Groceries";
  if (/(fuel|petrol|diesel|pump)/.test(normalized)) return "Fuel";
  if (/(education|school|college|tuition|course|iit ism|dhanbad)/.test(normalized)) return "Education";
  if (/(electricity|water|utility|utilities|bill|broadband|recharge)/.test(normalized)) return "Utilities";
  if (/(uber|ola|metro|transport|bus|train|flight|travel)/.test(normalized)) return "Transport";
  if (/(hospital|health|clinic|pharmacy|apollo|medical)/.test(normalized)) return "Healthcare";
  if (/(shopping|amazon|flipkart|myntra|retail|shop|meesho|vendify|craft)/.test(normalized)) return "Shopping";
  if (/(nach|neft|int\.pd|interest|charge|fee|bank|clearing corp|autopay|rbi)/.test(normalized)) return "Banking";
  if (/(payment from ph|upi\/[a-z\s.]+\/\d{6,}\/upi|upi\/[a-z\s.]+\/\d{6,}\/payment from)/.test(normalized)) return "Transfers";
  if (/(salary|income|refund|bonus)/.test(normalized)) return "Income";
  if (/(entertainment|movie|netflix|ott|gaming)/.test(normalized)) return "Entertainment";
  return "Others";
}

function normalizeMerchantName(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[^\w\s&.\-]/g, "")
    .trim();
}

function looksLikePersonName(name = "") {
  const cleaned = normalizeMerchantName(name);
  if (!cleaned) return false;
  if (/\d/.test(cleaned)) return false;
  if (/(shop|mart|trader|enter|hotel|medical|hospital|ism|bank|ltd|corp|stores|restaurant|fuel|vendify|meesho)/i.test(cleaned)) {
    return false;
  }
  const parts = cleaned.split(" ").filter(Boolean);
  return parts.length >= 2 && parts.length <= 4;
}

function normalizeCategory(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "Others";
  return normalizedCategoryMap[key] || "Others";
}

function enrichRecordCategory(row) {
  const sourceText = `${row.merchant || ""} ${row.rawFields?.statementDetails || ""} ${row.rawFields?.sourceText || ""}`;
  let category = normalizeCategory(row.category);
  if (category === "Others") {
    category = inferCategoryFromText(sourceText);
  }

  if (category === "Others" && looksLikePersonName(row.merchant)) {
    category = "Transfers";
  }

  return {
    ...row,
    category
  };
}

function parseDateFromText(text = "") {
  const match = String(text).match(
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/
  );
  return match?.[1] || "";
}

function extractMerchantFromDetails(details = "") {
  const normalized = String(details).replace(/\s+/g, " ").trim();

  const upiMatch = normalized.match(/(?:REV-)?UPI(?:_[^/]*)?\/([^/]+)\//i);
  if (upiMatch?.[1]) return normalizeMerchantName(upiMatch[1]);

  const neftMatch = normalized.match(/NEFT\s+[A-Z0-9]+?\s+([A-Za-z][A-Za-z\s.&-]{3,40})/i);
  if (neftMatch?.[1]) return normalizeMerchantName(neftMatch[1]);

  const nachMatch = normalized.match(/NACH-[A-Z-]+-([A-Za-z][A-Za-z\s.&-]{3,40})/i);
  if (nachMatch?.[1]) return normalizeMerchantName(nachMatch[1]);

  return "Unknown";
}

function parseStatementEntry(entryText = "") {
  const normalized = String(entryText).replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/^(DATE TRANSACTION DETAILS|Page \d+ of \d+|SUMMARY|AP-Aut)/i.test(normalized)) return null;

  const dateMatch = normalized.match(/^(\d{1,2}\s[A-Za-z]{3},\s\d{4})\s+/);
  if (!dateMatch) return null;
  const date = dateMatch[1];

  // Typical statement line ending: "<signed amount> <running balance>"
  const amountTailMatch = normalized.match(/([+-]-?\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})$/);
  if (!amountTailMatch) return null;

  const signedAmount = String(amountTailMatch[1]);
  const amount = Math.abs(toNumber(signedAmount));
  if (amount <= 0) return null;

  const detailsStartIdx = dateMatch[0].length;
  const detailsEndIdx = amountTailMatch.index ?? normalized.length;
  const details = normalized.slice(detailsStartIdx, detailsEndIdx).trim();
  const merchant = extractMerchantFromDetails(details);
  const type = signedAmount.startsWith("+") ? "credit" : signedAmount.startsWith("-") ? "debit" : inferTypeFromText(details);

  return {
    merchant,
    category: inferCategoryFromText(`${merchant} ${details}`),
    date,
    amount,
    type,
    rawFields: {
      statementDate: date,
      statementDetails: details,
      signedAmount,
      sourceText: normalized
    }
  };
}

function buildStatementEntriesFromLines(lines = []) {
  const entries = [];
  let buffer = "";

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    const isNewTxn = /^\d{1,2}\s[A-Za-z]{3},\s\d{4}\b/.test(line);
    if (isNewTxn && buffer) {
      entries.push(buffer.trim());
      buffer = line;
    } else {
      buffer = buffer ? `${buffer} ${line}` : line;
    }
  }

  if (buffer) entries.push(buffer.trim());
  return entries;
}

async function classifyMerchantsWithAi({ apiKey, merchants }) {
  if (!apiKey || merchants.length === 0) return {};

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
You classify merchant names into spending categories for a fintech app.
Return ONLY JSON object in this format:
{
  "merchant name": "Category"
}

Categories allowed:
Dining, Groceries, Fuel, Education, Utilities, Transport, Healthcare, Shopping, Income, Entertainment, Others

Merchants:
${JSON.stringify(merchants)}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildSummary(records) {
  const debits = records.filter((r) => r.type === "debit");
  const credits = records.filter((r) => r.type === "credit");

  const totalDebit = debits.reduce((sum, r) => sum + r.amount, 0);
  const totalCredit = credits.reduce((sum, r) => sum + r.amount, 0);

  const categoryTotals = {};
  const categoryCounts = {};
  const merchantTotals = {};
  for (const row of debits) {
    categoryTotals[row.category] = (categoryTotals[row.category] || 0) + row.amount;
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    merchantTotals[row.merchant] = (merchantTotals[row.merchant] || 0) + row.amount;
  }

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }));

  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }));

  const categoryStats = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const txCount = categoryCounts[category] || 0;
      return {
        category,
        amount: Math.round(amount),
        txCount,
        avgTicket: txCount > 0 ? Math.round(amount / txCount) : 0
      };
    });

  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([merchant, amount]) => ({ merchant, amount: Math.round(amount) }));

  const recentTransactions = records
    .slice()
    .reverse()
    .map((row, idx) => ({
      id: `csv-${idx}-${row.merchant}-${row.amount}`,
      merchant: row.merchant,
      category: row.category,
      amount: row.amount,
      type: row.type,
      date: row.date || "",
      rawFields: row.rawFields || {}
    }));

  return {
    recordCount: records.length,
    debitCount: debits.length,
    creditCount: credits.length,
    totalDebit: Math.round(totalDebit),
    totalCredit: Math.round(totalCredit),
    netFlow: Math.round(totalCredit - totalDebit),
    topCategories,
    topMerchants,
    categoryBreakdown,
    categoryStats,
    recentTransactions
  };
}

function parseAiJson(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

function fallbackInsights(summary) {
  const leadingCategory = summary.topCategories[0];
  const leadingMerchant = summary.topMerchants[0];
  const categorySharePct =
    leadingCategory && summary.totalDebit > 0
      ? Math.round((leadingCategory.amount / summary.totalDebit) * 100)
      : 0;

  return {
    headline: "Here is a clear summary of your spending pattern.",
    insights: [
      `We analyzed ${summary.recordCount} transactions. Total money spent is INR ${inrFormatter.format(summary.totalDebit)}.`,
      leadingCategory
        ? `${leadingCategory.category} is your top category at INR ${inrFormatter.format(leadingCategory.amount)} (${categorySharePct}% of total spending).`
        : "No category signals found in this upload.",
      leadingMerchant
        ? `${leadingMerchant.merchant} is your highest spend merchant at INR ${inrFormatter.format(leadingMerchant.amount)}.`
        : "No merchant-level pattern detected."
    ],
    recommendations: [
      "Set a monthly limit for your top spending category first.",
      "Track category spend weekly and trigger an alert at 70% usage."
    ],
    riskFlags: summary.netFlow < 0 ? ["Cash outflow is higher than inflow in this dataset."] : []
  };
}

async function generateAiInsights({ apiKey, summary, sampleRows }) {
  if (!apiKey) return fallbackInsights(summary);

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a fintech analyst for a personal finance app called FinSights AI.
Analyze the transaction summary and sample rows below.

Return ONLY valid JSON with this exact schema:
{
  "headline": string,
  "insights": string[],
  "recommendations": string[],
  "riskFlags": string[]
}

Constraints:
- Keep insights practical and user-facing.
- Mention spending concentration, saving opportunities, and risk patterns.
- 3 to 5 insights, 2 to 4 recommendations.
- Do not include markdown or extra keys.

Summary:
${JSON.stringify(summary)}

Sample rows:
${JSON.stringify(sampleRows)}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseAiJson(text);
  } catch {
    return fallbackInsights(summary);
  }
}

export async function analyzeCsvBuffer({ csvBuffer, apiKey }) {
  const csvText = csvBuffer.toString("utf-8");
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true
  });

  if (!rows.length) {
    throw new Error("CSV is empty or headers are invalid.");
  }

  const normalized = rows.map((row) => {
    const amountFromPrimary = toNumber(
      getByAliases(row, ["amount", "transactionamount", "txnamount", "value"])
    );
    const debitAmount = toNumber(getByAliases(row, ["debit", "withdrawal", "paid"]));
    const creditAmount = toNumber(getByAliases(row, ["credit", "deposit", "received"]));
    const amount = amountFromPrimary || debitAmount || creditAmount;

    return {
      merchant: String(
        getByAliases(row, ["merchant", "payee", "beneficiary", "description", "narration"])
      ).trim() || "Unknown",
      category: String(getByAliases(row, ["category", "cat", "group"])).trim() || "Others",
      date: String(getByAliases(row, ["date", "txndate", "timestamp", "time"])).trim() || "",
      amount,
      type: inferType(row),
      rawFields: row
    };
  });

  const validRows = normalized.filter((r) => r.amount > 0).map((row) => enrichRecordCategory(row));
  if (!validRows.length) {
    throw new Error("CSV parsed but no valid amount rows found.");
  }

  const summary = buildSummary(validRows);
  const sampleRows = validRows.slice(0, 40);
  const ai = await generateAiInsights({ apiKey, summary, sampleRows });

  return { summary, ai };
}

export async function analyzePdfBuffer({ pdfBuffer, apiKey }) {
  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed?.text || "";
  if (!text.trim()) {
    throw new Error("PDF has no readable text content.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return !/^(-- \d+ of \d+ --|DATE TRANSACTION DETAILS|Page \d+ of \d+|AP-Aut|SUMMARY)$/i.test(line);
    });

  const statementEntries = buildStatementEntriesFromLines(lines);
  let extracted = statementEntries
    .map((entry) => parseStatementEntry(entry))
    .filter(Boolean);

  if (!extracted.length) {
    throw new Error("No transaction-like rows found in the PDF.");
  }

  // AI enrichment: classify merchants in bulk for higher category quality.
  const uniqueMerchants = Array.from(
    new Set(extracted.map((row) => row.merchant).filter((merchant) => merchant && merchant !== "Unknown"))
  );
  const aiMerchantCategoryMap = await classifyMerchantsWithAi({
    apiKey,
    merchants: uniqueMerchants
  });

  extracted = extracted.map((row) => ({
    ...row,
    category: normalizeCategory(aiMerchantCategoryMap[row.merchant] || row.category)
  }));

  extracted = extracted.map((row) => enrichRecordCategory(row));

  const summary = buildSummary(extracted);
  const sampleRows = extracted.slice(0, 40);
  const ai = await generateAiInsights({ apiKey, summary, sampleRows });

  return { summary, ai };
}

