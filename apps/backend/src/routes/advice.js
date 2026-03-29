import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { evaluateTransactionAgainstGoal } from "../services/adviceAgent.js";
import { env } from "../config/env.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const extractedTxn = req.body?.extractedTxn;
    let allTransactions = req.body?.transactions || [];
    if (!extractedTxn) {
      return res.status(400).json({ error: "extractedTxn is required." });
    }

    if (allTransactions.length === 0 && Transaction.db.readyState === 1) {
      allTransactions = await Transaction.find().sort({ date: -1 }).limit(200).lean();
    }

    const advice = await evaluateTransactionAgainstGoal({
      apiKey: env.geminiApiKey,
      allTransactions,
      extractedTxn,
      userGoal: req.body?.goal
    });
    res.json(advice);
  } catch (error) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

