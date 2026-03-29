// Captures values like "INR 1,299.50" or "Rs 250".
const amountRegex = /(?:INR|Rs\.?)\s?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
// Captures textual transaction direction from bank message templates.
const debitRegex = /\b(debited|spent|paid|purchase|sent)\b/i;
const creditRegex = /\b(credited|received|refund)\b/i;

export function parseSmsTransaction(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("A valid SMS string is required.");
  }

  const normalized = rawText.replace(/\s+/g, " ").trim();
  const amountMatch = normalized.match(amountRegex);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : null;

  let type = "unknown";
  if (debitRegex.test(normalized)) type = "debit";
  if (creditRegex.test(normalized)) type = "credit";

  return {
    rawText: normalized,
    amount,
    type
  };
}

