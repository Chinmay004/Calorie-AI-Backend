const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  savedRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
