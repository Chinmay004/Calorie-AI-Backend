

// const path = require('path');
// const aiplatform = require('@google-cloud/aiplatform');
// const { PredictionServiceClient } = aiplatform.v1;
// const { helpers } = aiplatform;
// const admin = require('firebase-admin');  // Already initialized in your project
// const bucket = admin.storage().bucket();

// const projectId = process.env.GCP_PROJECT_ID;
// const location = process.env.GCP_LOCATION;
// const clientOptions = { apiEndpoint: `${location}-aiplatform.googleapis.com` };
// const predictionServiceClient = new PredictionServiceClient(clientOptions);

// function sanitizeFilename(filename) {
//     return filename.replace(/[^a-zA-Z0-9.-]+/g, '-');
// }

// async function generateImage(recipeTitle) {
//     try {
//         const prompt = `Create a high-quality image of a dish named ${recipeTitle}. Show a well-plated, realistic dish.`;

//         const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001`;
//         const promptText = { prompt };
//         const instanceValue = helpers.toValue(promptText);
//         const instances = [instanceValue];

//         const parameter = {
//             sampleCount: 1,
//             aspectRatio: '1:1',
//             safetyFilterLevel: 'block_some',
//         };
//         const parameters = helpers.toValue(parameter);

//         const request = { endpoint, instances, parameters };

//         const [response] = await predictionServiceClient.predict(request);

//         const predictions = response.predictions;

//         if (!predictions || predictions.length === 0) {
//             console.log('No image was generated.');
//             return [];
//         }

//         let i = 1;
//         const imageUrls = [];

//         for (const prediction of predictions) {
//             const base64Encoded = prediction.structValue.fields.bytesBase64Encoded.stringValue;
//             const buff = Buffer.from(base64Encoded, 'base64');

//             const filename = sanitizeFilename(`${recipeTitle}_${Date.now()}_${i}.png`);
//             const file = bucket.file(`recipes/${filename}`); // Will upload to: /recipes/filename.png in firebase storage

//             await file.save(buff, {
//                 contentType: 'image/png',
//             });


//             const publicUrl = `https://storage.googleapis.com/${bucket.name}/recipes/${filename}`;

//             imageUrls.push(publicUrl);
//             // await file.makePublic();
//             i++;
//             // const [url] = await file.getSignedUrl({
//             //     action: 'read',
//             //     expires: '03-01-2500',  // Set far future expiry
//             // });

//             // imageUrls.push(url);
//             // i++;
//         }

//         return imageUrls;
//     } catch (error) {
//         console.error("Error generating image:", error);
//         throw error;
//     }
// }

// module.exports = { generateImage };


const path = require('path');
const aiplatform = require('@google-cloud/aiplatform');
const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;
const admin = require('firebase-admin');

const bucket = admin.storage().bucket();

// Resolve path to the service account JSON key
const keyFilePath = path.join(__dirname, '..', 'config', 'vertex-key.json');

// GCP configuration
const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION;

// Setup Vertex AI client with explicit key file
const clientOptions = {
    apiEndpoint: `${location}-aiplatform.googleapis.com`,
    keyFilename: keyFilePath, // ✅ important!
};

const predictionServiceClient = new PredictionServiceClient(clientOptions);

// Sanitize filenames for Firebase Storage
function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]+/g, '-');
}

async function generateImage(recipeTitle) {
    try {
        const prompt = `Create a high-quality image of a dish named ${recipeTitle}. Show a well-plated, realistic dish.`;

        const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001`;
        const promptText = { prompt };
        const instanceValue = helpers.toValue(promptText);
        const instances = [instanceValue];

        const parameters = helpers.toValue({
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'block_some',
        });

        const request = {
            endpoint,
            instances,
            parameters,
        };

        const [response] = await predictionServiceClient.predict(request);

        const predictions = response.predictions;

        if (!predictions || predictions.length === 0) {
            console.log('No image was generated.');
            return [];
        }

        let i = 1;
        const imageUrls = [];

        for (const prediction of predictions) {
            const base64Encoded = prediction.structValue.fields.bytesBase64Encoded.stringValue;
            const buff = Buffer.from(base64Encoded, 'base64');

            const filename = sanitizeFilename(`${recipeTitle}_${Date.now()}_${i}.png`);
            const file = bucket.file(`recipes/${filename}`);

            await file.save(buff, {
                contentType: 'image/png',
            });

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/recipes/${filename}`;
            imageUrls.push(publicUrl);

            i++;
        }

        return imageUrls;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

module.exports = { generateImage };
