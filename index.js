const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");
const admin = require("firebase-admin");
const { GoogleAuth } = require("google-auth-library"); // Import GoogleAuth
const authRoutes = require("./routes/authRoutes"); 
const path = require("path"); 
const app = express();
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Google Cloud Authentication
const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Ensure this is set correctly
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

let authClient;

async function initializeGCPAuth() {
  try {
    authClient = await auth.getClient();
    console.log("✅ Google Cloud Auth Initialized");
  } catch (error) {
    console.error("❌ Google Cloud Authentication Failed:", error.message);
  }
}

initializeGCPAuth();

// Middleware
app.use("/generated_images", express.static(path.join(__dirname, "utils", "generated_images")));
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/recipes", require("./routes/recipeRoutes")); // Recipe routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/auth", require("./routes/authRoutes")); // Mount the auth routes

// Example endpoint to test Google Cloud authentication
app.get("/api/gcp-auth", async (req, res) => {
  try {
    const projectId = await auth.getProjectId();
    res.json({ message: "Google Cloud Auth Successful", projectId });
  } catch (error) {
    res.status(500).json({ error: "Google Cloud Authentication failed", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
