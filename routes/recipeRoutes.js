
const express = require("express");
const Recipe = require("../models/Recipe");
const { generateContent } = require("../utils/vertexRecipeGenerator");
const { generateImage } = require("../utils/vertexImageGenerator");
const User = require("../models/User");
const router = express.Router();
const admin = require("firebase-admin"); // Firebase Admin SDK
const path = require('path');
const mongoose = require("mongoose")
const rateLimit = require("express-rate-limit");
const { GoogleAuth } = require('google-auth-library');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');

const generateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 generate requests per windowMs
  message: { message: "Too many requests, please try again later." },
  headers: true, // Send rate limit info in headers
  keyGenerator: (req) => req.headers.authorization || req.ip // Limit by user token or IP
});



router.post("/", async (req, res) => {
  try {
    const { title, description, tags, ingredients, steps, image, creator } = req.body;

    const user = await User.findOne({ firebaseUID: creator });
    if (!user) return res.status(404).json({ message: "User not found" });


    const newRecipe = new Recipe({
      title,
      description,
      tags,
      ingredients,
      steps,
      image,
      creator,
    });

    await newRecipe.save();
    res.status(201).json({ message: "Recipe created successfully!", recipe: newRecipe });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { mealType, dishType, cuisine, search, sortBy } = req.query;
    let filter = {};

    // Apply filters
    if (mealType) filter["tags.mealType"] = mealType;
    if (dishType) filter["tags.dishType"] = dishType;
    if (cuisine) filter["tags.cuisine"] = cuisine;

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let recipes;

    if (sortBy === "most_liked") {
      recipes = await Recipe.aggregate([
        { $match: filter }, // Apply filters
        {
          $addFields: {
            likesCount: {
              $cond: {
                if: { $isArray: "$likedBy" },
                then: { $size: "$likedBy" },
                else: 0, // If likedBy is missing, set count to 0
              },
            },
          },
        },
        { $sort: { likesCount: -1 } }, // Sort by likes descending
      ]);
    } else {
      let sortOption = {};
      if (sortBy === "newest") sortOption = { createdAt: -1 };
      recipes = await Recipe.find(filter).sort(sortOption);
    }

    res.json(recipes);
  } catch (err) {
    console.error("Error fetching recipes:", err);
    res.status(500).json({ error: "Server error while fetching recipes" });
  }
});

router.get('/:recipeId', async (req, res) => {
  try {
      const recipe = await Recipe.findById(req.params.recipeId);
      if (!recipe) {
          return res.status(404).json({ message: 'Recipe not found' });
      }
      res.json(recipe);
  } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({ message: 'Server error' });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    await recipe.deleteOne();
    res.json({ message: "Recipe deleted successfully!" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


async function authenticateUser(req) {
  const idToken = req.headers.authorization;

  if (!idToken) {
      throw new Error("Unauthorized: Missing ID token"); // Throw error if not authenticated
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const firebaseUID = decodedToken.uid;

  let user = await User.findOne({ firebaseUID });

  if (!user) {
      const { name, email } = decodedToken;
      user = new User({ firebaseUID, name, email });
      await user.save();
      // console.log("User created in MongoDB:", user);
  } else {
      console.log("User already exists in MongoDB:", user);
  }
  return user; // Return the user object
}

function parseRecipeText(recipeText) {
  let title = '';
  let description = '';
  let tags = { mealType: 'Other', cuisine: 'Other', extra: [] };
  let ingredients = [];
  let steps = [];
  let nutrition = { calories: 0, protein: 0, carbs: 0, fats: 0, vitamins: "" };

  try {
      recipeText = recipeText.replace(/json\n|/g, '').trim(); // Remove Markdown
      const recipeData = JSON.parse(recipeText);

      title = recipeData.title || "Untitled Recipe";
      description = recipeData.description || "";

      // Extract tags
      if (recipeData.tags) {
          tags.mealType = recipeData.tags.mealType || "Other";
          tags.dishType = recipeData.tags.dishType || "Other";
          tags.cuisine = recipeData.tags.cuisine || "Other";
          tags.extra = recipeData.tags.extra || [];
      }

      // Extract ingredients
      if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
          ingredients = recipeData.ingredients.map(item => ({
              name: item.name,
              amount: item.amount 
          }));
      }

      // Extract steps
      steps = recipeData.steps || [];

      // Extract nutrition
      if (recipeData.nutrition) {
          nutrition = {
              calories: recipeData.nutrition.calories || 0,
              protein: recipeData.nutrition.protein || 0,
              carbs: recipeData.nutrition.carbs || 0,
              fats: recipeData.nutrition.fats || 0,
              vitamins: recipeData.nutrition.vitamins || ""
          };
      }

  } catch (error) {
      console.error("Error parsing recipe text:", error);
      title = "Untitled Recipe";
      description = "";
      tags = { mealType: 'Other', cuisine: 'Other',dishType:'Other', extra: [] };
      ingredients = [];
      steps = [];
      nutrition = { calories: 0, protein: 0, carbs: 0, fats: 0, vitamins: "" };
      likedBy = [];
  }``

  // Return the data in the format of your RecipeSchema
  return {
      title,
      description,
      tags,
      ingredients,
      steps,
      image: [], // Default empty array for images
      creator: null,
      likedBy:[],
      createdAt: new Date(),
      nutrition
  };
}

async function generateAndSaveRecipe(req, user) {
  const { ingredients: requestIngredients, dietaryPreferences } = req.body;
  const aiRecipe = await generateContent(requestIngredients, dietaryPreferences);
  // console.log("aiRecipe:", aiRecipe); // Check the returned value

  if (!aiRecipe) {
    console.error("failed to generate Recipe"+error)
      throw error;  
    }

  // Post-processing to remove Markdown code blocks
  let cleanedAiRecipe = aiRecipe.replace(/```json\n|```/g, '').trim(); // Corrected regex

  try {
    const recipeData = JSON.parse(cleanedAiRecipe); // Directly parse the recipe object

    const ingredients = recipeData.ingredients.map(ingredient => ({
      name: ingredient.item,
      amount: ingredient.amount  // Default amount is "1"
  }));

        const { title, description, tags, steps,nutrition, image, creator, likes, createdAt } = parseRecipeText(cleanedAiRecipe);

    const imagePaths = await generateImage(title);

    if (!imagePaths || imagePaths.length === 0) {
      console.error("No image paths found after recipe generation.");
      return null;
    }

    const filenames = imagePaths.map(imagePath => path.basename(imagePath));
    // console.log("FILENAMES CHECK IN RECIPEROUTES:"+filenames);
    const newRecipe = new Recipe({
      title, description, tags, ingredients, steps, image: filenames, creator: user._id, nutrition
    });


    const savedRecipe = await newRecipe.save();
    // console.log("Recipe saved:", savedRecipe);

    user.savedRecipes.push(savedRecipe._id);
    await user.save();
    // console.log(" IMAGEPATHS CHECK IN RECIPEROUTES:"+imagePaths);

    return { savedRecipe, imagePaths };
  } catch (error) {
    console.error("Error parsing or saving recipe:", error);
    return null;
  }
}

router.post("/generate",generateRateLimiter, async (req, res) => {
  try {
      const user = await authenticateUser(req); // Call authentication function
   

      const result = await generateAndSaveRecipe(req, user);

      if (!result || !result.savedRecipe) {
          return res.status(500).json({ message: result && result.message ? result.message : "Recipe generation or saving failed." });
      }

      const { savedRecipe, imagePaths } = result;

      if (!imagePaths || imagePaths.length === 0) {
        console.error("No image paths found after recipe generation.");
        return res.status(500).json({ message: "Image generation failed." });
    }

    const filenames = imagePaths.map(imagePath => {
      if (typeof imagePath === 'string') { // Check if it's a string path.
          return path.basename(imagePath); // Extract filename if it's a string path.
      } else if (Array.isArray(imagePath)) { // Check if it's an array of paths.
          return imagePath.map(p => path.basename(p)); // Extract filenames from the array.
      } else {
          console.warn("Invalid image path:", imagePath);
          return null;
      }
  }).filter(filename => filename !== null); // Filter out any nulls.

  // If you only have one image, you might want to send it as a single string
  // instead of an array with one string.
  const imageToSend = filenames.length === 1 ? filenames[0] : filenames;

    res.status(201).json({
        message: "Recipe generated and saved!",
        recipe: {
            ...savedRecipe._doc,
            image: filenames,
        }
    });

} catch (error) {
    console.error("Error in /generate route:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
}
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    // console.log(recipe);
    res.json(recipe); // Send the recipe data, including image filename
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

const likeRecipe = async (req, res) => {
  try {
      const { userId } = req.body; // Firebase UID (string)
      const { recipeId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(recipeId)) {
          return res.status(400).json({ error: "Invalid recipe ID" });
      }

      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
          return res.status(404).json({ error: "Recipe not found" });
      }
      const userIndex = recipe.likedBy.indexOf(userId);
        
      if (userIndex !== -1) {
          // User already liked it → Unlike (Remove from array)
          recipe.likedBy.splice(userIndex, 1);
      } else {
          // User hasn't liked it → Like (Add to array)
          recipe.likedBy.push(userId);
      }

      await recipe.save();

      res.json({
          message: userIndex !== -1 ? "Recipe unliked successfully" : "Recipe liked successfully",
          likedBy: recipe.likedBy
      });
  } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

router.post("/like/:recipeId", likeRecipe);









module.exports = router;
