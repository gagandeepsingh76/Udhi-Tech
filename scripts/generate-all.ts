import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { SCIENCE_CONCEPTS } from '../lib/concepts';
import { generateDiagramWithChecks } from '../lib/gemini';
import { DiagramResult } from '../lib/types';

async function main() {
  console.log('=== Udhi Technologies: Science Diagram Maker (Batch Generator) ===');
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not defined in environment or .env.local.');
    console.error('Please obtain a key from https://aistudio.google.com/api-keys and set it.');
    process.exit(1);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  console.log(`Using model: ${modelName}`);

  const results: DiagramResult[] = [];

  for (const concept of SCIENCE_CONCEPTS) {
    console.log(`\nGenerating diagram for Concept ${concept.id}: "${concept.name}" (${concept.subject})...`);
    try {
      const result = await generateDiagramWithChecks(concept, apiKey, modelName);
      console.log(`✓ Completed: ${result.conceptName}`);
      console.log(`  - Input Tokens: ${result.inputTokens}`);
      console.log(`  - Output Tokens: ${result.outputTokens}`);
      console.log(`  - Cost (USD): $${result.costUsd.toFixed(6)}`);
      console.log(`  - Retries: ${result.retries}`);
      console.log(`  - All Checks Passed: ${result.validation.allPassed ? 'YES' : 'NO'}`);
      results.push(result);
    } catch (err: any) {
      console.error(`✗ Error generating for "${concept.name}":`, err.message || err);
    }
  }

  // Save to data/results.json and public/results.json
  const dataDir = path.join(process.cwd(), 'data');
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const dataPath = path.join(dataDir, 'results.json');
  const publicPath = path.join(publicDir, 'results.json');
  const rootPath = path.join(process.cwd(), 'results.json');

  const jsonStr = JSON.stringify(results, null, 2);
  fs.writeFileSync(dataPath, jsonStr, 'utf-8');
  fs.writeFileSync(publicPath, jsonStr, 'utf-8');
  fs.writeFileSync(rootPath, jsonStr, 'utf-8');

  console.log(`\nSuccessfully saved ${results.length} diagram results to:`);
  console.log(` - ${dataPath}`);
  console.log(` - ${publicPath}`);
  console.log(` - ${rootPath}`);
}

main().catch(console.error);
