import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    await connectDb(env.mongodbUri);
    app.listen(env.port, () => {
      console.log(`FinSights backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

start();

