import cors from "cors";
import express from "express";
import healthRouter from "./routes/health.js";
import ingestionRouter from "./routes/ingestion.js";
import adviceRouter from "./routes/advice.js";
import parseTransactionRouter from "./routes/parseTransaction.js";
import csvInsightsRouter from "./routes/csvInsights.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/api/ingestion", ingestionRouter);
app.use("/api/advice", adviceRouter);
app.use("/api/parse-transaction", parseTransactionRouter);
app.use("/api/insights/csv", csvInsightsRouter);

export default app;

