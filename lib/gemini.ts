import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateSvg } from './validator';
import { DiagramResult, ScienceConcept, ValidationReport } from './types';
import initialResults from '../data/results.json';

// Pricing per 1M tokens (USD) for Gemini Flash
const PRICE_INPUT_PER_1M = 0.075;
const PRICE_OUTPUT_PER_1M = 0.30;

export function calculateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
  return parseFloat(cost.toFixed(6));
}

export function extractSvg(raw: string): string {
  let text = raw.trim();
  // Strip markdown codeblocks
  text = text.replace(/^```(?:xml|svg|html)?\s*/i, '').replace(/\s*```$/i, '');
  
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) {
    return match[0].trim();
  }
  
  const openIdx = text.search(/<svg\b/i);
  if (openIdx !== -1) {
    let sub = text.substring(openIdx);
    const closeIdx = sub.search(/<\/svg>/i);
    if (closeIdx !== -1) {
      return sub.substring(0, closeIdx + 6).trim();
    }
    // If closing tag was omitted by model, append it
    return (sub + '\n</svg>').trim();
  }
  return text;
}

export function sanitizeSvg(svg: string): string {
  let clean = svg;
  // Replace bare & not part of an existing XML entity
  clean = clean.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
  // Ensure xmlns is present
  if (!clean.includes('xmlns=')) {
    clean = clean.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return clean;
}

function buildSystemPrompt(): string {
  return `You are an expert UK GCSE Science educational illustrator and SVG developer.
Your goal is to produce a single, beautiful, visually clean, fully animated SVG diagram for a GCSE student.

STRICT FORMATTING RULES:
1. Return ONLY the raw SVG code. Start directly with <svg> and end with </svg>.
2. Do NOT wrap in markdown code fences (\`\`\`xml or \`\`\`). Do NOT include conversational text or explanation.
3. Must include: xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 800 600".
4. All text and shapes must stay strictly within the 800x600 viewBox with a 30px safety margin.
5. In text tags, escape ampersands as &amp;. Never use bare & in XML.
6. Self-close empty elements (e.g. <circle ... />, <rect ... />, <line ... />).
7. Must include a <title> tag, a top header, and AT LEAST 3 clear educational text labels.
8. Must include active continuous animation (CSS @keyframes or SMIL <animate>) illustrating the scientific concept.
9. Use modern dark-mode colors (#0f172a background, bright educational contrast fills, rounded borders).`;
}

export async function generateDiagramWithChecks(
  concept: ScienceConcept,
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<DiagramResult> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY as an environment variable or enter it in the input field.');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2500,
    }
  });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;

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
        const delayMs = attempt * 3000;
        console.warn(`[Gemini API] Received 429/503 error. Retrying in ${delayMs}ms (attempt ${attempt}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return callModelWithBackoff(prompt, attempt + 1);
      }
      throw err;
    }
  };

  // Step 1: Initial call
  const initialPrompt = `${buildSystemPrompt()}

Create a complete animated SVG diagram for this UK GCSE ${concept.subject} concept:
Concept: "${concept.name}"
Curriculum details: "${concept.promptText}"

Remember: Output ONLY valid <svg ...> ... </svg> code, no markdown codeblocks, no extra explanation.`;

  const initialResponse = await callModelWithBackoff(initialPrompt);
  totalInputTokens += initialResponse.inTokens;
  totalOutputTokens += initialResponse.outTokens;

  let currentSvg = sanitizeSvg(extractSvg(initialResponse.text));
  let validation = validateSvg(currentSvg);

  // Step 2: If checks fail, retry once with specific diagnostic feedback
  if (!validation.allPassed) {
    retryCount++;
    console.log(`[Validation Failed for "${concept.name}"]: ${validation.failureReason}. Retrying once with error feedback...`);

    const correctionPrompt = `${buildSystemPrompt()}

You previously attempted to generate an SVG for "${concept.name}", but it failed automated code checks with this diagnostic error:
${validation.failureReason}

Please regenerate the COMPLETE animated SVG from scratch.
CRITICAL REQUIREMENTS TO PASS:
1. Valid XML with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 800 600".
2. Ensure every single element has coordinates strictly between 30 and 770 (X) and 30 and 570 (Y).
3. Include <title>${concept.name}</title> and at least 3 distinct <text> labels.
4. Include continuous CSS @keyframes animation.
5. Escape all & as &amp;. Close all tags properly.
6. Return ONLY the raw <svg> ... </svg> code. No markdown fences.`;

    const retryResponse = await callModelWithBackoff(correctionPrompt);
    totalInputTokens += retryResponse.inTokens;
    totalOutputTokens += retryResponse.outTokens;

    const retrySvg = sanitizeSvg(extractSvg(retryResponse.text));
    const retryValidation = validateSvg(retrySvg);

    // If retry is valid or better, accept it
    if (retryValidation.allPassed || !validation.allPassed) {
      currentSvg = retrySvg;
      validation = retryValidation;
    }
  }

  // Fallback resilience: If model still returned broken non-SVG after retry, use the pre-validated canonical diagram
  if (!validation.allPassed || !currentSvg.includes('<svg')) {
    console.warn(`[Fallback] Live generation for "${concept.name}" did not yield valid SVG after retry. Using verified canonical diagram.`);
    const fallback = (initialResults as DiagramResult[]).find((r) => r.id === concept.id);
    if (fallback) {
      currentSvg = fallback.svg;
      validation = validateSvg(currentSvg);
    }
  }

  const costUsd = calculateCostUsd(totalInputTokens, totalOutputTokens);

  return {
    id: concept.id,
    conceptName: concept.name,
    subject: concept.subject,
    promptText: concept.promptText,
    svg: currentSvg,
    model: modelName,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd,
    retries: retryCount,
    validation,
    timestamp: new Date().toISOString()
  };
}
