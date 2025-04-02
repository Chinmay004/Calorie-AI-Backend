const fs = require("fs");
require("dotenv").config();



const templatePath = 'config/gcp-key.template.json';
const outputPath = 'config/gcp-key.json';

const template = fs.readFileSync(templatePath, 'utf8');
const config = template.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '');

fs.writeFileSync(outputPath, config); // Save the final JSON file
console.log(`✅ gcp-key.json generated successfully in ${outputPath}`);
