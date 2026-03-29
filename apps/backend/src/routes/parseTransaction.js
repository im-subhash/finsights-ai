import { Router } from "express";
import { env } from "../config/env.js";
import { Transaction } from "../models/Transaction.js";
import { evaluateTransactionAgainstGoal } from "../services/adviceAgent.js";
import { extractStructuredMetadata } from "../services/geminiExtractor.js";
import { parseSmsTransaction } from "../services/smsParser.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { rawSms, userGoalId = "mock-goal-dining-5000" } = req.body || {};
    if (!rawSms) {
      return res.status(400).json({ error: "rawSms is required." });
    }

    // Step 1: Fast deterministic extraction (amount + debit/credit) using regex.
    const regexParsed = parseSmsTransaction(rawSms);
    if (!regexParsed.amount) {
      return res.status(400).json({ error: "Could not extract amount from SMS." });
    }

    // Step 2: Semantic extraction via Gemini prompt chain (merchant + category).
    const llmExtracted = await extractStructuredMetadata({
      apiKey: env.geminiApiKey,
      rawText: regexParsed.rawText,
      amount: regexParsed.amount,
      type: regexParsed.type
    });

    const transactionPayload = {
      rawText: regexParsed.rawText,
      amount: Number(llmExtracted.Amount ?? regexParsed.amount),
      merchant: llmExtracted.Merchant || "Unknown",
      category: llmExtracted.Category || "Others",
      date: new Date(),
      userGoalId,
      type: llmExtracted.Type || regexParsed.type,
      metadata: {
        confidence: llmExtracted.confidence || "unknown",
        source: "sms"
      }
    };

    let savedTransaction = null;
    let categoryTransactions = [];
    if (Transaction.db.readyState === 1) {
      savedTransaction = await Transaction.create(transactionPayload);
      categoryTransactions = await Transaction.find({
        userGoalId,
        category: transactionPayload.category,
        type: "debit"
      }).lean();
    }

    const advice = await evaluateTransactionAgainstGoal({
      apiKey: env.geminiApiKey,
      allTransactions: categoryTransactions,
      extractedTxn: {
        Merchant: transactionPayload.merchant,
        Category: transactionPayload.category,
        Amount: transactionPayload.amount,
        Type: transactionPayload.type
      }
    });

    return res.status(200).json({
      regexParsed,
      extracted: llmExtracted,
      advisory: advice,
      transaction: savedTransaction || transactionPayload
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

