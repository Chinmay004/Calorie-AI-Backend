const express = require("express");
const User = require("../models/User");
const Recipe = require("../models/Recipe");
const userSchema = require("../validators/userValidator");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body); // Validate request data

    let user = await User.findOne({ firebaseUID: validatedData.firebaseUID });

    if (!user) {
      user = new User({ ...validatedData, savedRecipes: [] });
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.errors }); // Return validation errors
  }
});

router.get("/:firebaseUID", async (req, res) => {
  try {
    const { firebaseUID } = req.params;

    const user = await User.findOne({ firebaseUID }).populate("savedRecipes");
    if (!user) return res.status(404).json({ message: "User not found" });

    const likedRecipes = await Recipe.find({ likedBy: firebaseUID });

    res.json({
      name: user.name,
      email: user.email,
      savedRecipes: user.savedRecipes,
      likedRecipes: likedRecipes.map(recipe => ({
        id: recipe._id,
        title: recipe.title,
        image: recipe.image[0] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/save-recipe", async (req, res) => {
  try {
    const { firebaseUID, recipeId } = req.body;
    const user = await User.findOne({ firebaseUID });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.savedRecipes.includes(recipeId)) {
      user.savedRecipes.push(recipeId);
      await user.save();
    }

    res.json({ message: "Recipe saved!", savedRecipes: user.savedRecipes });
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
});

router.patch("/update-name", async (req, res) => {
  try {
    const { firebaseUID, newName } = req.body;

    if (!firebaseUID || !newName) {
      return res.status(400).json({ message: "firebaseUID and newName are required" });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUID },
      { name: newName },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Name updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.patch("/update-email", async (req, res) => {
  try {
    const { firebaseUID, newEmail } = req.body;

    if (!firebaseUID || !newEmail) {
      return res.status(400).json({ message: "firebaseUID and newEmail are required" });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const user = await User.findOneAndUpdate(
      { firebaseUID },
      { email: newEmail },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Email updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
