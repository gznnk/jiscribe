import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone/index.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../src/schemas/canvas/canvas-doc.schema.json");
const outPath = join(__dirname, "../src/schemas/canvas/validators/generated-schema-validator.js");

const schemaStr = readFileSync(schemaPath, "utf-8");
const schema = JSON.parse(schemaStr);

// To generate standalone code, `code.source` must be true.
const ajv = new Ajv({ 
  code: { source: true, esm: true }, 
  allErrors: true, 
  strict: false 
});

const validate = ajv.compile(schema);
const moduleCode = standaloneCode(ajv, validate);

writeFileSync(outPath, moduleCode);
console.log(`✅ Schema validator successfully generated at: ${outPath}`);