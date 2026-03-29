import { generateProactiveNudge } from "./geminiExtractor.js";

const mockDiningGoal = {
  id: "mock-goal-dining-5000",
  category: "Dining",
  monthlyLimit: 5000
};

export async function evaluateTransactionAgainstGoal({
  apiKey,
  allTransactions,
  extractedTxn,
  userGoal = mockDiningGoal
}) {
  const sameCategoryDebitTxns = allTransactions.filter(
    (txn) =>
      String(txn?.category || txn?.Category || "").toLowerCase() === userGoal.category.toLowerCase() &&
      String(txn?.type || txn?.Type || "").toLowerCase() === "debit"
  );

  const spentBeforeTxn = sameCategoryDebitTxns.reduce((sum, txn) => sum + (Number(txn.amount || txn.Amount) || 0), 0);
  const spentAfterTxn = spentBeforeTxn + (Number(extractedTxn.Amount) || 0);
  const budgetUsagePct = Math.round((spentAfterTxn / userGoal.monthlyLimit) * 100);
  const nearLimit = budgetUsagePct >= 80;

  let nudge = `Current ${userGoal.category} spend is INR ${spentAfterTxn} out of INR ${userGoal.monthlyLimit}.`;
  if (nearLimit) {
    nudge = await generateProactiveNudge({
      apiKey,
      transaction: extractedTxn,
      goal: userGoal,
      spentBeforeTxn,
      spentAfterTxn
    });
  }

  return { userGoal, spentBeforeTxn, spentAfterTxn, budgetUsagePct, nearLimit, nudge };
}

