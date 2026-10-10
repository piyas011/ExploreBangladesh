import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";

export const mongoClient = uri ? new MongoClient(uri) : null;

export async function saveTravelMongoRecord(payload: Record<string, unknown>) {
  if (!mongoClient) {
    return { enabled: false, message: "MongoDB is not configured; demo mode is active." };
  }

  try {
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB || "bangladesh-travel");
    const collection = db.collection("user_travel");
    await collection.insertOne({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return { enabled: true, message: "Saved to MongoDB" };
  } catch (error) {
    console.error("MongoDB error:", error);
    return { enabled: false, message: "MongoDB save failed; falling back to client storage." };
  } finally {
    await mongoClient.close();
  }
}
