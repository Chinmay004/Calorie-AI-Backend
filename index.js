const fs = require("fs");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");
const admin = require("firebase-admin");
const path = require('path'); 
const app = express();
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
const { GoogleAuth } = require('google-auth-library');



const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

// Authenticate using GoogleAuth
const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Example: Get an auth client
async function getAuthClient() {
  const client = await auth.getClient();
  console.log("Authenticated successfully!", client);
}

getAuthClient();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

  
// Middleware
app.use('/generated_images', express.static(path.join(__dirname, 'utils', 'generated_images')));
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/recipes", require("./routes/recipeRoutes")); // Recipe routes
app.use("/api/users", require("./routes/userRoutes"));
app.use('/api/auth', require("./routes/authRoutes")); // Mount the auth routes


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));






