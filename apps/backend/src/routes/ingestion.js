import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { env } from "../config/env.js";
import { parseSmsTransaction } from "../services/smsParser.js";
import { extractStructuredMetadata } from "../services/geminiExtractor.js";

const router = Router();

router.post("/sms", async (req, res) => {
  try {
    const { message } = req.body || {};
    const parsed = parseSmsTransaction(message);

    if (!parsed.amount) {
      return res.status(400).json({
        error: "Could not parse transaction amount from SMS."
      });
    }

    const extracted = await extractStructuredMetadata({
      apiKey: env.geminiApiKey,
      rawText: parsed.rawText,
      amount: parsed.amount,
      type: parsed.type
    });

    let transactionDoc = null;
    if (Transaction.db.readyState === 1) {
      transactionDoc = await Transaction.create({
        rawText: parsed.rawText,
        amount: extracted.Amount ?? parsed.amount,
        merchant: extracted.Merchant ?? "Unknown",
        category: extracted.Category ?? "Others",
        type: extracted.Type ?? parsed.type,
        metadata: {
          extractorConfidence: extracted.confidence || "unknown"
        }
      });
    }

    return res.status(201).json({
      parsed,
      extracted,
      transaction: transactionDoc
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

