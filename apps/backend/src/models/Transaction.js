import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Raw inbound content from SMS/email before any LLM processing.
    rawText: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    merchant: {
      type: String,
      default: "Unknown"
    },
    category: {
      type: String,
      default: "Uncategorized"
    },
    date: {
      type: Date,
      default: Date.now
    },
    userGoalId: {
      type: String,
      default: "mock-goal-dining-5000"
    },
    // Helpful operational fields for ingestion and advisory behavior.
    type: {
      type: String,
      enum: ["debit", "credit", "unknown"],
      default: "unknown"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);

