import "dotenv/config";
import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "node:crypto";

const app = express();

// Allowed CORS origins
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// Razorpay keys from environment
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment"
  );
}

// Create Razorpay instance
const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Health check endpoint for Render
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Create Razorpay order
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }

    const options = {
      amount: Math.round(numericAmount * 100), // convert to paise
      currency,
      receipt: receipt || `r_${Date.now()}`.slice(0, 40), // ensure < 40 chars
    };

    const order = await razorpay.orders.create(options);
    return res.json(order);
  } catch (error: any) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json({ message: error?.message || "Failed to create order" });
  }
});

// Verify payment signature
app.post("/api/razorpay/verify", (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature === signature) {
      return res.json({ success: true });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to verify payment",
    });
  }
});

// 🚀 Use ONLY the Render-provided PORT
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Razorpay server running on port ${PORT}`);
});

