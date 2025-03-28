const {VertexAI} = require('@google-cloud/vertexai');

// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({project: 'optimal-waters-449905-a2', location: 'us-central1'});
const model = 'gemini-1.5-flash-002';

const textsi_1 =`You are a recipe assistant app. Your primary function is to generate recipes based on user-provided ingredients and dietary preferences. You MUST respond with ONLY JSON objects. Do not include any introductory or explanatory text outside of the JSON. The JSON object will be parsed directly by the application, so it must be valid and parsable. Use double quotes for all keys and string values. If you cannot determine a value, use an empty string "" or an empty array [].`

// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 1016,
    temperature: 1,
    topP: 0.95,
    seed: 0,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'OFF',
    }
  ],
  systemInstruction: {
    parts:[{ text: textsi_1 }]
  },
});




  async function generateContent(ingredients,dietaryPreferences) {
    

    const text1 = {
      text: `Generate a detailed recipe based on:
        - Ingredients: ${ingredients}
        - Dietary Preferences: ${dietaryPreferences}
        
        The JSON structure should strictly follow this format:
        {
          "title": "Your Recipe Title",
          "description": "A brief description of your recipe.",
          "tags": {
            "mealType": "Vegan", // or "Gluten-Free", "High-Protein", "Low-Carb", "Keto", "Paleo","Veg","Non-Veg",use only these mentioned tags
            "cuisine": "Italian", // or "Mexican", "Indian", "Chinese", etc.
            "dishType": "Main Course", or "Appetizer","Soup","Salad", etc.
            "extra": ["Tag1", "Tag2"] // Optional extra tags
          },
          "ingredients": [
            {
              "item": "Ingredient Name 1",
              "amount": "Amount 1"
            },
            {
              "item": "Ingredient Name 2",
              "amount": "Amount 2"
            }
          ],
          "steps": [
            "Instruction for step 1.",
            "Instruction for step 2.",
            "Instruction for step 3."
          ],
          please dont add values like 20g add like 20. 
          "nutrition": {
            "calories": 200,
            "protein": 10,
            "carbs": 30,
            "fats": 5,
            "vitamins": "Vitamin C : 20mg" // Example: Only one vitamin
          }
        }`
    };
      


    const req = {
    contents: [
      {role: 'user', parts: [text1]}
    ],
  };



const streamingResp = await generativeModel.generateContentStream(req);

let fullResponseText = ''; // Accumulate the AI-generated JSON string

    for await (const item of streamingResp.stream) {
        if (item.candidates && item.candidates[0] && item.candidates[0].content && item.candidates[0].content.parts) {
            item.candidates[0].content.parts.forEach(part => {
                fullResponseText += part.text;
            });
        }
    }

    return fullResponseText; // Return the raw AI-generated JSON string
}




module.exports = {generateContent};