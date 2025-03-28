const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  tags: {
    mealType: { type: String, required: true, default: "Other" },
    cuisine: { type: String, required: true, default: "Other" },
    dishType: { type:String,required:true,default:"Other"},
    extra: [{ type: String }],
  },
  ingredients: [
    {
      name: { type: String, required: true },
      amount: { type: String, required: true },
    },
  ],
  steps: { type: [String], required: true },
  image: [{ type: String }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  likedBy: [{ type: String }], // Store Firebase UID as a string
  createdAt: { type: Date, default: Date.now },

  // Nutritional Facts (for the entire recipe)
  nutrition: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
    vitamins: { type: String }, // Only one vitamin will be stored
  },
});

module.exports = mongoose.model("Recipe", RecipeSchema);
