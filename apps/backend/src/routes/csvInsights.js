import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { analyzeCsvBuffer, analyzePdfBuffer } from "../services/csvInsights.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.csvMaxFileSizeMb * 1024 * 1024 }
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Max allowed size is ${env.csvMaxFileSizeMb}MB.`
      });
    }

    if (error) {
      return res.status(400).json({ error: error.message || "Invalid file upload request." });
    }

    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV or PDF file is required (field name: file)." });
    }
    if (req.file.size <= 0) {
      return res.status(400).json({ error: "File is empty. Please upload a file larger than 0KB." });
    }

    const mimetype = req.file.mimetype || "";
    const originalName = req.file.originalname?.toLowerCase() || "";
    const isCsvLike =
      mimetype.includes("csv") ||
      originalName.endsWith(".csv");
    const isPdfLike =
      mimetype.includes("pdf") ||
      originalName.endsWith(".pdf");

    if (!isCsvLike && !isPdfLike) {
      return res.status(400).json({ error: "Only CSV and PDF files are supported." });
    }

    const result = isPdfLike
      ? await analyzePdfBuffer({
          pdfBuffer: req.file.buffer,
          apiKey: env.geminiApiKey
        })
      : await analyzeCsvBuffer({
          csvBuffer: req.file.buffer,
          apiKey: env.geminiApiKey
        });

    return res.json({
      fileName: req.file.originalname,
      ...result
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "File analysis failed." });
  }
});

export default router;

