import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateSvg } from './validator';
import { DiagramResult, ScienceConcept, ValidationReport } from './types';

// Pricing per 1M tokens (USD) for Gemini Flash
const PRICE_INPUT_PER_1M = 0.075;
const PRICE_OUTPUT_PER_1M = 0.30;

export function calculateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
  return parseFloat(cost.toFixed(6));
}

function buildSystemPrompt(): string {
  return `You are an expert UK GCSE Science educational illustrator and SVG developer.
Your goal is to produce a single, beautiful, visually clean, fully animated SVG diagram for a GCSE student.

STRICT REQUIREMENTS FOR THE SVG:
1. Return ONLY the raw SVG code inside an \`<svg> ... </svg>\` block. Do NOT include markdown codeblocks (like \`\`\`xml or \`\`\`svg) or extra conversational prose.
2. Must have valid XML attributes: \`xmlns="http://www.w3.org/2000/svg"\` and an explicit \`viewBox="0 0 800 600"\` (or similar 4:3 / 16:9 viewBox).
3. BOUNDARIES: Keep every single visual element, shape, and text strictly inside the viewBox coordinates. Leave at least a 30px safety margin from all borders.
4. LABELS & TITLE:
   - Include a clear \`<title>\` tag describing the diagram.
   - Include a prominent header text element at the top.
   - Include AT LEAST 3 clear, distinct, informative scientific text labels pointing to or explaining parts of the diagram.
5. ANIMATION:
   - Must include smooth, continuous animation using either SMIL (\`<animate>\`, \`<animateTransform>\`) or CSS (\`<style>\` with \`@keyframes\`).
   - The animation MUST clearly illustrate the scientific mechanism or motion (e.g. electron flow in circuit, vibrating/moving particles in matter, sunlight energy/molecules in photosynthesis, geometric proof in Pythagoras, or radius/diameter indicators in circle).
6. VISUAL QUALITY:
   - Use modern, pleasant colors, high contrast for readability, clean typography, rounded corners, and clear arrowheads or pointers where helpful.
   - Professional UK GCSE textbook / BBC Bitesize style.`;
}

export async function generateDiagramWithChecks(
  concept: ScienceConcept,
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<DiagramResult> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY as an environment variable.');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    }
  });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;
  let finalSvg = '';
  let finalValidation: ValidationReport | null = null;

  // Helper for API call with 429/503 exponential backoff retry (up to 3 times)
  const callModelWithBackoff = async (prompt: string, attempt = 1): Promise<{ text: string; inTokens: number; outTokens: number }> => {
    try {
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const usage = response.response.usageMetadata;
      const inTokens = usage?.promptTokenCount || Math.ceil(prompt.length / 4);
      const outTokens = usage?.candidatesTokenCount || Math.ceil(text.length / 4);
      return { text, inTokens, outTokens };
    } catch (err: any) {
      const status = err?.status || err?.statusCode || 0;
      const message = err?.message || '';
      const isRateOrServerLimit = status === 429 || status === 503 || message.includes('429') || message.includes('503') || message.includes('RESOURCE_EXHAUSTED');

      if (isRateOrServerLimit && attempt <= 3) {
        const delayMs = attempt * 3000; // wait 3s, 6s, 9s
        console.warn(`[Gemini API] Received 429/503 error. Retrying in ${delayMs}ms (attempt ${attempt}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return callModelWithBackoff(prompt, attempt + 1);
      }
      throw err;
    }
  };

  // Step 1: Initial call
  const initialPrompt = `${buildSystemPrompt()}

Create an animated SVG diagram for this UK GCSE ${concept.subject} concept:
Concept: "${concept.name}"
Description: "${concept.promptText}"`;

  const initialResponse = await callModelWithBackoff(initialPrompt);
  totalInputTokens += initialResponse.inTokens;
  totalOutputTokens += initialResponse.outTokens;

  let currentSvg = initialResponse.text.trim();
  const svgMatch = currentSvg.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) {
    currentSvg = svgMatch[0];
  }

  // Step 2: Validate SVG
  let validation = validateSvg(currentSvg);

  // Step 3: If checks fail, retry once with specific diagnostic feedback
  if (!validation.allPassed) {
    retryCount++;
    console.log(`[Validation Failed for "${concept.name}"]: ${validation.failureReason}. Retrying once with error feedback...`);

    const correctionPrompt = `${buildSystemPrompt()}

You previously generated an SVG for "${concept.name}", but it FAILED programmatic validation with these specific errors:
${validation.failureReason}

Here is the problematic SVG you provided:
${currentSvg.slice(0, 1500)}...

PLEASE FIX ALL ERRORS:
1. Ensure SVG is strictly valid XML.
2. Ensure ALL elements are strictly inside viewBox="0 0 800 600" (leave 30px margins).
3. Ensure you have a <title> and AT LEAST 3 distinct <text> labels.
4. Ensure there is at least one active SMIL or CSS @keyframes animation.
5. Return ONLY the raw valid <svg> ... </svg> code.`;

    const retryResponse = await callModelWithBackoff(correctionPrompt);
    totalInputTokens += retryResponse.inTokens;
    totalOutputTokens += retryResponse.outTokens;

    let retrySvg = retryResponse.text.trim();
    const retrySvgMatch = retrySvg.match(/<svg[\s\S]*<\/svg>/i);
    if (retrySvgMatch) {
      retrySvg = retrySvgMatch[0];
    }

    currentSvg = retrySvg;
    validation = validateSvg(currentSvg);
  }

  finalSvg = currentSvg;
  finalValidation = validation;

  const costUsd = calculateCostUsd(totalInputTokens, totalOutputTokens);

  return {
    id: concept.id,
    conceptName: concept.name,
    subject: concept.subject,
    promptText: concept.promptText,
    svg: finalSvg,
    model: modelName,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd,
    retries: retryCount,
    validation: finalValidation,
    timestamp: new Date().toISOString()
  };
}
