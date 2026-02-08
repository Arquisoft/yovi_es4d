const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connect = async () => {
  try {
    const dbUrl = process.env.DB_URL || "mongodb://127.0.0.1:27017/bd";

    await mongoose.connect(dbUrl);

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error conectando Mongo:", error);
  }
};

const disconnect = async () => {
  await mongoose.disconnect();
};

module.exports = { connect, disconnect };
