
const path = require('path');
const aiplatform = require('@google-cloud/aiplatform');
const fs = require('fs').promises;
const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION;
const clientOptions = { apiEndpoint: `${location}-aiplatform.googleapis.com` };
const predictionServiceClient = new PredictionServiceClient(clientOptions);


function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]+/g, '-');
}

async function generateImage(recipeTitle) {
    try {
        const prompt = `Create a high-quality image of a dish named ${recipeTitle}. Show a well-plated, realistic dish.`;
        const outputFolder = path.join(__dirname,'generated_images');

        

        const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001`;
        const promptText = { prompt };
        const instanceValue = helpers.toValue(promptText);
        const instances = [instanceValue];

        const parameter = {
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'block_some',
        };
        const parameters = helpers.toValue(parameter);

        const request = { endpoint, instances, parameters };

        const [response] = await predictionServiceClient.predict(request);

        const predictions = response.predictions;

        if (!predictions || predictions.length === 0) { // Check for null or undefined predictions as well
            console.log('No image was generated. Check the request parameters and prompt.');
            return []; // Return an empty array
        }

        let i = 1;
        const imagePaths = [];

        for (const prediction of predictions) {
          

            const base64Encoded = prediction.structValue.fields.bytesBase64Encoded.stringValue;
            const buff = Buffer.from(base64Encoded, 'base64');

            const filename = sanitizeFilename(`${recipeTitle}_${i}.png`); // Corrected template literal           
            const filePath = path.join(outputFolder, filename); // Construct full path
            await fs.writeFile(filePath, buff); // Use filePath


            // console.log(`Saved image ${filePath}`);
            imagePaths.push(filename);
            i++;
        }

        return imagePaths; // <--- This is the crucial return statement!
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

module.exports = { generateImage };