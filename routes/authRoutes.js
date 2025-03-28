const express = require('express');
const router = express.Router();
const admin = require("firebase-admin"); // Firebase Admin SDK
const User = require("../models/User"); // Your User model

router.post('/login', async (req, res) => {
    try {
        const idToken = req.headers.authorization?.split('Bearer ')[1]; // Extract token

        if (!idToken) {
            return res.status(401).json({ message: 'Unauthorized: Missing token' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseUID = decodedToken.uid;

        let user = await User.findOne({ firebaseUID });

        if (!user) {
            const { name, email } = decodedToken;
            user = new User({ firebaseUID, name, email });
            await user.save();
        }

        res.json({ message: 'Login successful IN BACKEND', user }); // Send user data back

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Login failed' });
    }
});

router.post("/signup", async (req, res) => {
    try {
        const idToken = req.headers.authorization?.split('Bearer ')[1]; // Extract Firebase token

        if (!idToken) {
            return res.status(401).json({ message: "Unauthorized: Missing token" });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseUID = decodedToken.uid;
        const email = decodedToken.email

        let user = await User.findOne({ firebaseUID });

     

        if (!user) {
            let name = req.body.name?.trim(); // Take name from request body

            // If login via Google, use Firebase-provided name
            if (decodedToken.firebase.sign_in_provider === "google.com") {
                name = decodedToken.name || "New User"; 
            }

            if (!name) {
                return res.status(400).json({ message: "Name is required" });
            }

            user = new User({ firebaseUID, name, email });
            await user.save();
        } else {
            return res.status(400).json({ message: "User already exists" });
        }


        res.status(201).json({ message: "Signup successful IN BACKEND", user });

    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ message: "Signup failed" });
    }
});

router.get('/getUser', async (req, res) => {
    try {
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseUID = decodedToken.uid;

        const user = await User.findOne({ firebaseUID });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ name: user.name });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Error fetching user" });
    }
});




module.exports = router;