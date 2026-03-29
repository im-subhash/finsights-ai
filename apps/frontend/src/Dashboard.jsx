import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Brain,
  CarFront,
  Coffee,
  CreditCard,
  Droplets,
  GraduationCap,
  HeartPulse,
  Flame,
  Home,
  Landmark,
  Mic,
  Pill,
  ScanSearch,
  ShoppingBag,
  Sparkles,
  Tv,
  TrainFront,
  Upload,
  UtensilsCrossed,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { uploadCsvForInsights } from "./api";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

const categoryMeta = {
  Dining: { icon: UtensilsCrossed, color: "#ef4444" },
  Groceries: { icon: ShoppingBag, color: "#f97316" },
  Healthcare: { icon: Pill, color: "#60a5fa" },
  Transport: { icon: TrainFront, color: "#a78bfa" },
  Shopping: { icon: CreditCard, color: "#22c55e" },
  Others: { icon: Wallet, color: "#94a3b8" }
};

const categoryRules = [
  { test: /(shopping|shop|ecom|amazon|flipkart|myntra|retail)/i, icon: CreditCard, color: "#22c55e" },
  { test: /(grocery|grocer|mart|supermarket)/i, icon: ShoppingBag, color: "#f59e0b" },
  { test: /(dining|food|restaurant|zomato|swiggy|cafe)/i, icon: UtensilsCrossed, color: "#ef4444" },
  { test: /(fuel|petrol|diesel|gas|pump)/i, icon: CarFront, color: "#fb7185" },
  { test: /(education|school|college|course|tuition|exam)/i, icon: GraduationCap, color: "#8b5cf6" },
  { test: /(utility|utilities|electricity|water|bill)/i, icon: Droplets, color: "#38bdf8" },
  { test: /(rent|home|house|maintenance)/i, icon: Home, color: "#f97316" },
  { test: /(health|medical|hospital|clinic|pharmacy|apollo)/i, icon: HeartPulse, color: "#60a5fa" },
  { test: /(travel|transport|metro|bus|uber|ola|rapido|cab|flight|train)/i, icon: TrainFront, color: "#a78bfa" },
  { test: /(salary|income|bonus|refund|credit)/i, icon: Landmark, color: "#10b981" },
  { test: /(entertainment|movie|ott|netflix|prime video|gaming)/i, icon: Tv, color: "#e879f9" },
  { test: /(transfer|transfers|payment from|payment made)/i, icon: Landmark, color: "#14b8a6" },
  { test: /(banking|bank|neft|nach|interest|charges|fee|clearing)/i, icon: Landmark, color: "#f97316" }
];

function getCategoryVisual(categoryName = "") {
  const directMatch = categoryMeta[categoryName];
  if (directMatch) return directMatch;

  const categoryText = String(categoryName || "").trim();
  return categoryRules.find((rule) => rule.test.test(categoryText)) || categoryMeta.Others;
}

const defaultChartData = [
  { name: "Dining", value: 2140 },
  { name: "Groceries", value: 1320 },
  { name: "Healthcare", value: 680 },
  { name: "Transport", value: 420 },
  { name: "Shopping", value: 890 },
  { name: "Others", value: 310 }
];

const defaultTransactions = [
  {
    id: "t1",
    merchant: "Zomato",
    category: "Dining",
    date: new Date(2026, 2, 24),
    amount: 249,
    type: "debit"
  },
  {
    id: "t2",
    merchant: "Jupiter Rewards",
    category: "Others",
    date: new Date(2026, 2, 24),
    amount: 120,
    type: "credit"
  },
  {
    id: "t3",
    merchant: "Apollo",
    category: "Healthcare",
    date: new Date(2026, 2, 23),
    amount: 449,
    type: "debit"
  },
  {
    id: "t4",
    merchant: "Uber",
    category: "Transport",
    date: new Date(2026, 2, 23),
    amount: 188,
    type: "debit"
  },
  {
    id: "t5",
    merchant: "Swiggy",
    category: "Dining",
    date: new Date(2026, 2, 22),
    amount: 379,
    type: "debit"
  },
  {
    id: "t6",
    merchant: "Amazon",
    category: "Shopping",
    date: new Date(2026, 2, 21),
    amount: 899,
    type: "debit"
  }
];

function GlassCard({ className = "", children }) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function formatAmount(amount, type) {
  const sign = type === "credit" ? "+" : "-";
  return `${sign}₹${currency.format(Math.abs(amount))}`;
}

function normalizeChartData(breakdown = []) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return defaultChartData;
  return breakdown
    .slice(0, 6)
    .map((row) => ({
      name: String(row.category || "Others"),
      value: Number(row.amount) || 0
    }))
    .filter((row) => row.value > 0);
}

function normalizeTransactions(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return defaultTransactions;
  return rows.map((row, idx) => ({
    id: row.id || `txn-${idx}`,
    merchant: String(row.merchant || "Unknown"),
    category: String(row.category || "Others"),
    amount: Number(row.amount) || 0,
    type: row.type === "credit" ? "credit" : "debit",
    date: row.date ? new Date(row.date) : new Date(),
    rawFields: row.rawFields && typeof row.rawFields === "object" ? row.rawFields : {}
  }));
}

function formatTxnDate(dateValue) {
  const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? "Unknown date" : shortDate.format(parsed);
}

function buildSpendingTrendData(transactions = [], selectedCategoryName = "Category") {
  const dailyMap = {};

  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const dateObj = txn.date instanceof Date ? txn.date : new Date(txn.date);
    if (Number.isNaN(dateObj.getTime())) continue;

    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(
      dateObj.getDate()
    ).padStart(2, "0")}`;
    if (!dailyMap[key]) {
      dailyMap[key] = {
        day: dateObj.toLocaleString("en-IN", { day: "2-digit", month: "short" }),
        total: 0,
        selectedCategory: 0
      };
    }

    dailyMap[key].total += Number(txn.amount) || 0;
    if (String(txn.category).toLowerCase() === String(selectedCategoryName).toLowerCase()) {
      dailyMap[key].selectedCategory += Number(txn.amount) || 0;
    }
  }

  const sorted = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-31)
    .map(([, value]) => ({
      day: value.day,
      total: Math.round(value.total),
      selectedCategory: Math.round(value.selectedCategory)
    }));

  if (sorted.length > 0) return sorted;

  return [
    { day: "01 Mar", total: 1200, selectedCategory: 340 },
    { day: "02 Mar", total: 980, selectedCategory: 290 },
    { day: "03 Mar", total: 1110, selectedCategory: 330 }
  ];
}

export default function Dashboard() {
  const maxCsvSizeMb = 10;
  const inputRef = useRef(null);
  const [csvInsights, setCsvInsights] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [feedMode, setFeedMode] = useState("all");
  const [activeTxnId, setActiveTxnId] = useState("");
  const [allFeedCategoryFilter, setAllFeedCategoryFilter] = useState("All");
  const [showBoostPanel, setShowBoostPanel] = useState(false);
  const [boostSavings, setBoostSavings] = useState(0);
  const [appliedBoosts, setAppliedBoosts] = useState([]);

  const summary = csvInsights?.summary;
  const derivedChartData = normalizeChartData(summary?.categoryBreakdown);
  const derivedTransactions = normalizeTransactions(summary?.recentTransactions);
  const categoryStats = Array.isArray(summary?.categoryStats) ? summary.categoryStats : [];
  const totalDebit = Number(summary?.totalDebit || 0);
  const totalCredit = Number(summary?.totalCredit || 0);
  const netFlow = Number(summary?.netFlow || 0);
  const baseSafeToSpend = csvInsights
    ? Math.max(0, Math.round(netFlow / 30))
    : 860;
  const safeToSpend = baseSafeToSpend + boostSavings;
  const defaultNudge =
    "You spent 20% more on food this week. Limit dining out to 2 times to hit your ₹5k savings goal.";

  const selectedCategoryName =
    derivedChartData.find((row) => row.name === selectedCategory)?.name
    || derivedChartData[0]?.name
    || "Dining";
  const goalLimit = Math.max(5000, Math.round(totalDebit || 5000));
  const selectedCategorySpent =
    categoryStats.find((row) => row.category === selectedCategoryName)?.amount
    || derivedChartData.find((row) => row.name === selectedCategoryName)?.value
    || 4120;
  const selectedCategorySharePct =
    totalDebit > 0 ? Math.round((selectedCategorySpent / totalDebit) * 100) : 0;
  const utilizationPct = Math.min(100, Math.round((selectedCategorySpent / goalLimit) * 100));

  const categoryGuidance =
    selectedCategorySharePct >= 35
      ? `This category is driving your spending. Set a weekly cap for ${selectedCategoryName}.`
      : selectedCategorySharePct >= 20
        ? `${selectedCategoryName} is a moderate expense area. Monitor it weekly to stay in control.`
        : `${selectedCategoryName} is under control right now. Keep tracking for consistency.`;

  const nudge = csvInsights
    ? `We analyzed ${summary?.recordCount || 0} transactions. You spent ₹${currency.format(
        totalDebit
      )} in total. In ${selectedCategoryName}, you spent ₹${currency.format(
        selectedCategorySpent
      )} (${selectedCategorySharePct}% of debit). ${categoryGuidance}`
    : defaultNudge;

  const selectedCategoryTransactions = derivedTransactions.filter(
    (txn) => String(txn.category).toLowerCase() === String(selectedCategoryName).toLowerCase()
  );
  const selectedCategoryStat = categoryStats.find(
    (row) => String(row.category).toLowerCase() === String(selectedCategoryName).toLowerCase()
  );
  const selectedTxnCount = Number(selectedCategoryStat?.txCount || 0);
  const avgTicket = Number(selectedCategoryStat?.avgTicket || 0);
  const lastCategoryTxn = selectedCategoryTransactions[0];

  const preferredAllFeedCategories = ["Transfers", "Banking", "Others", "Healthcare", "Dining"];
  const discoveredCategories = Array.from(
    new Set(derivedTransactions.map((txn) => String(txn.category || "Others")).filter(Boolean))
  );
  const allFeedCategoryOptions = [
    "All",
    ...preferredAllFeedCategories,
    ...discoveredCategories.filter((cat) => !preferredAllFeedCategories.includes(cat))
  ];

  const smartFeedTransactions =
    feedMode === "category"
      ? selectedCategoryTransactions
      : allFeedCategoryFilter === "All"
        ? derivedTransactions
        : derivedTransactions.filter(
            (txn) =>
              String(txn.category).toLowerCase() === String(allFeedCategoryFilter).toLowerCase()
          );
  const activeTxn =
    smartFeedTransactions.find((txn) => txn.id === activeTxnId) || smartFeedTransactions[0] || null;
  const activeTxnRawEntries = Object.entries(activeTxn?.rawFields || {}).filter(
    ([key, value]) => String(key).trim() && String(value).trim()
  );
  const spendingTrendData = buildSpendingTrendData(derivedTransactions, selectedCategoryName);

  const boostActions = derivedChartData
    .filter((row) => row.value > 0)
    .slice(0, 5)
    .map((row) => {
      const cutPct = row.value === derivedChartData[0]?.value ? 20 : 10;
      const savingsPerMonth = Math.round((row.value * cutPct) / 100);
      const savingsPerDay = Math.round(savingsPerMonth / 30);
      return { category: row.name, currentSpend: row.value, cutPct, savingsPerMonth, savingsPerDay };
    });

  function handleToggleBoostAction(category, savingsPerDay) {
    setAppliedBoosts((prev) => {
      const exists = prev.find((b) => b.category === category);
      if (exists) {
        const next = prev.filter((b) => b.category !== category);
        setBoostSavings(next.reduce((sum, b) => sum + b.savingsPerDay, 0));
        return next;
      }
      const next = [...prev, { category, savingsPerDay }];
      setBoostSavings(next.reduce((sum, b) => sum + b.savingsPerDay, 0));
      return next;
    });
  }

  async function handleCsvSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv") || file.type.includes("csv");
    const isPdf = lowerName.endsWith(".pdf") || file.type.includes("pdf");
    if (!isCsv && !isPdf) {
      setCsvError("Please upload a valid .csv or .pdf file.");
      setCsvInsights(null);
      return;
    }
    if (file.size <= 0) {
      setCsvError("Uploaded file is empty. Please upload a file larger than 0KB.");
      setCsvInsights(null);
      event.target.value = "";
      return;
    }

    if (file.size > maxCsvSizeMb * 1024 * 1024) {
      setCsvError(`File too large. Please upload a CSV or PDF up to ${maxCsvSizeMb}MB.`);
      setCsvInsights(null);
      event.target.value = "";
      return;
    }

    setCsvLoading(true);
    setCsvError("");
    try {
      const result = await uploadCsvForInsights(file);
      setCsvInsights(result);
      const firstCategory = normalizeChartData(result?.summary?.categoryBreakdown)[0]?.name || "";
      setSelectedCategory(firstCategory);
      setShowInsightsPanel(true);
      setFeedMode("category");
      setActiveTxnId("");
      setAllFeedCategoryFilter("All");
      setBoostSavings(0);
      setAppliedBoosts([]);
      setShowBoostPanel(false);
    } catch (error) {
      setCsvError(error.message || "CSV/PDF analysis failed");
      setCsvInsights(null);
    } finally {
      setCsvLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="min-h-full bg-zinc-950">
      {/* Soft neon background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute top-52 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-[440px] flex-col px-4 pb-28 pt-6">
        {/* HERO HEADER */}
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Hey Subhash</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
                Safe to spend today
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
              <BadgeCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-200">Protected</span>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-5xl font-semibold leading-none tracking-tight text-zinc-50">
                ₹{currency.format(safeToSpend)}
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {boostSavings > 0
                  ? `Boosted by ₹${currency.format(boostSavings)}/day from ${appliedBoosts.length} action${appliedBoosts.length > 1 ? "s" : ""}`
                  : "Based on your goals, bills, and trendline"}
              </p>
            </div>
            <button
              onClick={() => setShowBoostPanel((prev) => !prev)}
              className="group inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(239,68,68,0.25)] transition active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4 opacity-90 transition group-hover:rotate-6" />
              {showBoostPanel ? "Close" : "Boost"}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showBoostPanel && (
            <motion.div
              key="boost-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mb-4 overflow-hidden"
            >
              <GlassCard className="p-4 shadow-glow">
                <p className="text-sm font-semibold text-zinc-50">Smart Boost Planner</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Toggle actions to boost your daily safe-to-spend amount.
                </p>

                <div className="mt-3 space-y-2">
                  {boostActions.map((action) => {
                    const isApplied = appliedBoosts.some((b) => b.category === action.category);
                    const meta = getCategoryVisual(action.category);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={action.category}
                        onClick={() => handleToggleBoostAction(action.category, action.savingsPerDay)}
                        className={[
                          "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition active:scale-[0.995]",
                          isApplied
                            ? "border-red-500/40 bg-red-600/10"
                            : "border-white/10 bg-white/5"
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/30">
                            <Icon className="h-5 w-5" style={{ color: meta.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              Cut {action.category} by {action.cutPct}%
                            </p>
                            <p className="text-xs text-zinc-400">
                              Save ₹{currency.format(action.savingsPerDay)}/day (₹{currency.format(action.savingsPerMonth)}/mo)
                            </p>
                          </div>
                        </div>
                        <div
                          className={[
                            "h-5 w-5 rounded-full border-2 transition",
                            isApplied ? "border-red-500 bg-red-500" : "border-zinc-600 bg-transparent"
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>

                {boostSavings > 0 && (
                  <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-xs font-semibold text-emerald-400">
                      Boost active: +₹{currency.format(boostSavings)}/day added to Safe to Spend
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      That's ₹{currency.format(boostSavings * 30)} extra savings per month if you stay on track.
                    </p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI ADVISORY CARD */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mb-4"
        >
          <GlassCard className="relative overflow-hidden p-4 shadow-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-transparent" />
            <motion.div
              aria-hidden="true"
              className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-red-600/20 blur-2xl"
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-600/20">
                <Brain className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-50">AI Nudge</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200">
                    <Flame className="h-3.5 w-3.5 text-red-400" />
                    Proactive
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                  <span className="font-semibold text-red-400">Heads up:</span>{" "}
                  {nudge}
                </p>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-zinc-300" />
                      <p className="text-xs text-zinc-300">{selectedCategoryName} focus</p>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100">
                      ₹{currency.format(selectedCategorySpent)} / ₹{currency.format(goalLimit)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: `${utilizationPct}%` }}
                    />
                  </div>
                  {csvInsights ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      {selectedCategoryName} contributes{" "}
                      <span className="text-zinc-200">{selectedCategorySharePct}%</span> of your total debit.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">
                      You’re at <span className="text-zinc-200">{utilizationPct}%</span> of this month’s limit
                    </p>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* VISUALIZER */}
        <GlassCard className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Spending breakdown</p>
              <p className="mt-1 text-xs text-zinc-400">This week • auto-categorized</p>
            </div>
            <button
              onClick={() => setShowInsightsPanel((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition active:scale-[0.99]"
            >
              <ArrowUpRight className="h-4 w-4 text-red-400" />
              {showInsightsPanel ? "Hide insights" : "Insights"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[140px_1fr] items-center gap-4">
            <div className="h-[140px] w-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={derivedChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                    onClick={(slice) => setSelectedCategory(slice?.name || "")}
                  >
                    {derivedChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={getCategoryVisual(entry.name).color}
                        fillOpacity={entry.name === selectedCategoryName ? 1 : 0.75}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(24,24,27,0.92)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      color: "#e4e4e7"
                    }}
                    formatter={(v) => [`₹${currency.format(v)}`, "Spend"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {derivedChartData.slice(0, 5).map((row) => {
                const meta = getCategoryVisual(row.name);
                const Icon = meta.icon;
                return (
                  <button
                    key={row.name}
                    onClick={() => setSelectedCategory(row.name)}
                    className={[
                      "flex w-full items-center justify-between rounded-2xl px-2 py-1 text-left transition",
                      row.name === selectedCategoryName ? "bg-white/10" : "bg-transparent"
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5"
                        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: meta.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{row.name}</p>
                        <p className="text-xs text-zinc-500">Auto-tagged</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100">
                      ₹{currency.format(row.value)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {showInsightsPanel && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Category insights: {selectedCategoryName}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-zinc-500">Share</p>
                  <p className="text-sm font-semibold text-zinc-100">{selectedCategorySharePct}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-zinc-500">Transactions</p>
                  <p className="text-sm font-semibold text-zinc-100">{selectedTxnCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-zinc-500">Avg spend</p>
                  <p className="text-sm font-semibold text-zinc-100">₹{currency.format(avgTicket)}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-300">
                {selectedCategorySharePct >= 35
                  ? `High concentration detected in ${selectedCategoryName}. Set a weekly cap and track variance every 3 days.`
                  : selectedCategorySharePct >= 20
                    ? `${selectedCategoryName} is a moderate spend driver. Keep a soft cap and review weekly.`
                    : `${selectedCategoryName} is currently stable. Continue monitoring for sudden spikes.`}
              </p>

              {lastCategoryTxn && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  Latest: {lastCategoryTxn.merchant} • {formatTxnDate(lastCategoryTxn.date)} • ₹
                  {currency.format(lastCategoryTxn.amount)}
                </p>
              )}
            </motion.div>
          )}
        </GlassCard>

        {/* SPENDING TREND GRAPH */}
        <GlassCard className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Spending pattern trend</p>
              <p className="mt-1 text-xs text-zinc-400">
                Day-wise debit vs {selectedCategoryName} spend (last 1 month)
              </p>
            </div>
            <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-300">
              Last 1 month
            </span>
          </div>

          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTrendData} barGap={6}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="#a1a1aa"
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, spendingTrendData.length - 8)}
                />
                <YAxis
                  stroke="#a1a1aa"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(24,24,27,0.92)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    color: "#e4e4e7"
                  }}
                  formatter={(value, key) => [
                    `₹${currency.format(value)}`,
                    key === "selectedCategory" ? selectedCategoryName : "Total debit"
                  ]}
                />
                <Bar dataKey="total" fill="rgba(148,163,184,0.7)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="selectedCategory" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CSV/PDF AI ANALYZER */}
        <GlassCard className="mb-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Bulk CSV/PDF AI Analyzer</p>
              <p className="mt-1 text-xs text-zinc-400">
                Upload Kaggle/bank CSV or transaction PDF for instant insights
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">Max file size: {maxCsvSizeMb}MB</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={csvLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
            >
              <Upload className="h-4 w-4" />
              {csvLoading ? "Analyzing..." : "Upload file"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.pdf,application/pdf,text/csv"
              onChange={handleCsvSelect}
              className="hidden"
            />
          </div>

          {csvError && (
            <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {csvError}
            </p>
          )}

          {csvInsights && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[11px] text-zinc-500">Records</p>
                  <p className="text-sm font-semibold text-zinc-100">
                    {csvInsights.summary?.recordCount || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[11px] text-zinc-500">Debit</p>
                  <p className="text-sm font-semibold text-zinc-100">
                    ₹{currency.format(totalDebit)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[11px] text-zinc-500">Credit</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    ₹{currency.format(totalCredit)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <ScanSearch className="h-4 w-4 text-red-400" />
                  AI Headline
                </p>
                <p className="mt-1 text-sm text-zinc-200">{csvInsights.ai?.headline}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Insights
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                  {(csvInsights.ai?.insights || []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Net flow
                </p>
                <p className={`mt-1 text-sm font-semibold ${netFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {netFlow >= 0 ? "+" : "-"}₹{currency.format(Math.abs(netFlow))}
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* SMART TRANSACTION FEED */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Recent</p>
              <p className="mt-1 text-xs text-zinc-400">Tap a transaction for details</p>
            </div>
            <button
              onClick={() =>
                setFeedMode((prev) => {
                  const next = prev === "all" ? "category" : "all";
                  if (next === "all") setAllFeedCategoryFilter("All");
                  return next;
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition active:scale-[0.99]"
            >
              <Brain className="h-4 w-4 text-red-400" />
              {feedMode === "all" ? "All feed" : `${selectedCategoryName} feed`}
            </button>
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">
            Showing {smartFeedTransactions.length} transactions (
            {feedMode === "all" ? `${allFeedCategoryFilter} view` : `${selectedCategoryName} view`})
          </p>

          {feedMode === "all" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {allFeedCategoryOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setAllFeedCategoryFilter(option);
                    setActiveTxnId("");
                  }}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                    allFeedCategoryFilter === option
                      ? "border-red-500/40 bg-red-600/20 text-red-300"
                      : "border-white/10 bg-white/5 text-zinc-300"
                  ].join(" ")}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
            {smartFeedTransactions.map((txn) => {
              const meta = getCategoryVisual(txn.category);
              const Icon = meta.icon;
              const amountColor = txn.type === "credit" ? "text-emerald-400" : "text-zinc-200";
              return (
                <button
                  key={txn.id}
                  onClick={() => setActiveTxnId(txn.id)}
                  className={[
                    "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left backdrop-blur-xl",
                    "transition active:scale-[0.995]",
                    activeTxnId === txn.id ? "ring-1 ring-red-500/40" : ""
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/30">
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {txn.merchant}
                        </p>
                        <p className={`text-sm font-semibold ${amountColor}`}>
                          {formatAmount(txn.amount, txn.type)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-zinc-400">{txn.category}</p>
                        <p className="text-xs text-zinc-500">{formatTxnDate(txn.date)}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {smartFeedTransactions.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-xs text-zinc-400">
                No transactions found for this category in the recent feed.
              </div>
            )}
          </div>

          {activeTxn && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Transaction insight</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-100">{activeTxn.merchant}</p>
                <p className={`text-sm font-semibold ${activeTxn.type === "credit" ? "text-emerald-400" : "text-zinc-200"}`}>
                  {formatAmount(activeTxn.amount, activeTxn.type)}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {activeTxn.category} • {formatTxnDate(activeTxn.date)} • {activeTxn.type}
              </p>
              <p className="mt-2 text-xs text-zinc-300">
                {activeTxn.type === "debit"
                  ? `This spend falls under ${activeTxn.category}. Keep this category within your planned weekly cap.`
                  : `Credit transaction detected. This can improve your net flow for the current period.`}
              </p>

              {feedMode === "all" && activeTxnRawEntries.length > 0 && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Uploaded file fields for this transaction
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {activeTxnRawEntries.slice(0, 12).map(([key, value]) => (
                      <div key={`${key}-${value}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <p className="text-[10px] text-zinc-500">{key}</p>
                        <p className="truncate text-xs text-zinc-200">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/5">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-100">Privacy mode</p>
                <p className="text-[11px] text-zinc-500">Your SMS is processed securely</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1">
                <Brain className="h-4 w-4 text-red-400" />
                Gemini
              </span>
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                Local rules
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* FAB */}
      <div className="fixed inset-x-0 bottom-6 z-50">
        <div className="mx-auto flex max-w-[440px] justify-center px-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className={[
              "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-4",
              "bg-red-600 text-white shadow-[0_18px_60px_rgba(239,68,68,0.35)]",
              "border border-white/10"
            ].join(" ")}
            aria-label="Voice assistant"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(239,68,68,0.0)",
                  "0 0 0 10px rgba(239,68,68,0.10)",
                  "0 0 0 0 rgba(239,68,68,0.0)"
                ]
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <Mic className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-tight">Ask FinSights</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

