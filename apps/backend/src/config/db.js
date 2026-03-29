import mongoose from "mongoose";

export async function connectDb(mongodbUri) {
  if (!mongodbUri) {
    console.warn("MONGODB_URI is missing; backend will run without DB connection.");
    return false;
  }

  try {
    await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.warn(
      `MongoDB connection failed; continuing without DB. Reason: ${error?.message || "unknown"}`
    );
    return false;
  }
}

