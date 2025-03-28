const { z } = require("zod");

const userSchema = z.object({
  firebaseUID: z.string().min(1, "Firebase UID is required"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  savedRecipes: z.array(z.string()).optional(), // MongoDB ObjectIds are strings
});

module.exports = userSchema;
