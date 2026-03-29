import { GoogleGenerativeAI } from "@google/generative-ai";

const merchantCategoryFallback = [
  { match: /\bapollo tyres\b/i, category: "Automotive" },
  { match: /\bapollo\b/i, category: "Healthcare" },
  { match: /\bzomato|swiggy\b/i, category: "Dining" },
  { match: /\buber|ola|rapido\b/i, category: "Transport" },
  { match: /\bamazon|flipkart|myntra\b/i, category: "Shopping" }
];

function fallbackCategory(merchant = "") {
  const found = merchantCategoryFallback.find((rule) => rule.match.test(merchant));
  return found ? found.category : "Others";
}

function getModel(apiKey) {
  const genAi = new GoogleGenerativeAI(apiKey);
  return genAi.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function buildFallbackExtraction({ rawText, amount, type, confidence = "low" }) {
  const merchantGuess =
    rawText.match(/(?:at|to|from)\s([A-Za-z0-9&\-\.\s]{2,40})(?:\s|$|\.|,)/i)?.[1]?.trim() ||
    "Unknown";
  return {
    Merchant: merchantGuess,
    Category: fallbackCategory(merchantGuess),
    Amount: amount,
    Type: type,
    confidence
  };
}

export async function extractStructuredMetadata({ apiKey, rawText, amount, type }) {
  // Fallback for local development without cloud credentials.
  if (!apiKey) {
    return buildFallbackExtraction({ rawText, amount, type, confidence: "fallback" });
  }

  const model = getModel(apiKey);

  // Prompt chain strategy:
  // 1) Pin strict output schema with explicit enum-like guidance.
  // 2) Force semantic disambiguation examples (Apollo vs Apollo Tyres).
  // 3) Require JSON-only output for deterministic API parsing.
  const prompt = `
You are a fintech transaction extraction engine.
You must return ONLY strict JSON with this exact shape:
{
  "Merchant": string,
  "Category": string,
  "Amount": number | null,
  "Type": "debit" | "credit" | "unknown",
  "confidence": "high"|"medium"|"low"
}

Rules:
- Use semantic context to classify accurately.
- "Apollo" usually maps to "Healthcare", but "Apollo Tyres" maps to "Automotive".
- Prefer practical categories: Dining, Groceries, Healthcare, Automotive, Shopping, Utilities, Travel, Entertainment, Others.
- Respond with only valid JSON and no markdown.

Input SMS:
${rawText}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text);
  } catch {
    return buildFallbackExtraction({ rawText, amount, type, confidence: "low" });
  }
}

export async function generateProactiveNudge({
  apiKey,
  transaction,
  goal,
  spentBeforeTxn,
  spentAfterTxn
}) {
  const budget = Number(goal?.monthlyLimit || 5000);
  const category = goal?.category || "Dining";
  const usagePct = Math.round((spentAfterTxn / budget) * 100);

  if (!apiKey) {
    if (usagePct >= 80) {
      return `You are at ${usagePct}% of your ${category} budget. Limit dining out to 2 times this week to stay within your INR ${budget} goal.`;
    }
    return `Current ${category} spend is INR ${spentAfterTxn}. Stay mindful to protect your INR ${budget} monthly goal.`;
  }

  const model = getModel(apiKey);
  const prompt = `
You are a personal finance coach. Write one short proactive nudge.
Tone: practical, supportive, non-judgmental.
Max length: 24 words.

Inputs:
- Category Goal: ${category}
- Monthly Limit INR: ${budget}
- Spend Before This Transaction INR: ${spentBeforeTxn}
- Spend After This Transaction INR: ${spentAfterTxn}
- New Transaction Merchant: ${transaction.Merchant}
- New Transaction Amount INR: ${transaction.Amount}

If spend after transaction is above 80% of limit, suggest specific action (for example reducing dining frequency).
Return plain text only.
`;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    if (usagePct >= 80) {
      return `You are at ${usagePct}% of your ${category} budget. Limit dining out to 2 times this week to stay within your INR ${budget} goal.`;
    }
    return `Current ${category} spend is INR ${spentAfterTxn}. Stay mindful to protect your INR ${budget} monthly goal.`;
  }
}

