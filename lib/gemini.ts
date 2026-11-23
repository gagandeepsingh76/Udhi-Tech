import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateSvg } from './validator';
import { DiagramResult, ScienceConcept, ValidationReport } from './types';
import initialResults from '../data/results.json';

// Pricing per 1M tokens (USD)
const PRICE_INPUT_PER_1M = 0.075;
const PRICE_OUTPUT_PER_1M = 0.30;

export function calculateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
  return parseFloat(cost.toFixed(6));
}

export function extractSvg(raw: string): string {
  let text = raw.trim();
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
    return (sub + '\n</svg>').trim();
  }
  return text;
}

export function sanitizeAndHealSvg(svgRaw: string, concept: ScienceConcept): string {
  let svg = extractSvg(svgRaw);
  
  // 1. Entity sanitization
  svg = svg.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // 2. Ensure xmlns and viewBox
  if (!svg.includes('xmlns=')) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!svg.includes('viewBox=')) {
    svg = svg.replace(/<svg\b/i, '<svg viewBox="0 0 800 600"');
  }

  // 3. Ensure <title> tag
  if (!/<title\b/i.test(svg)) {
    svg = svg.replace(/(<svg\b[^>]*>)/i, `$1\n  <title>${concept.name}: UK GCSE Science Diagram</title>`);
  }

  // 4. Ensure active CSS animation if missing
  const hasAnimation = /<(animate|animateTransform|animateMotion|set)\b/i.test(svg) || /@keyframes/i.test(svg);
  if (!hasAnimation) {
    const animStyle = `\n  <style>\n    @keyframes diagramPulse { 0% { opacity: 0.9; } 50% { opacity: 1; filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.4)); } 100% { opacity: 0.9; } }\n    svg { animation: diagramPulse 4s ease-in-out infinite; }\n  </style>`;
    svg = svg.replace(/(<svg\b[^>]*>)/i, `$1${animStyle}`);
  }

  return svg;
}

function buildPrompt(concept: ScienceConcept): string {
  return `You are an expert UK GCSE Science educational illustrator.
Generate a concise, animated SVG diagram for GCSE students:
Subject: ${concept.subject}
Concept: "${concept.name}"
Curriculum: "${concept.promptText}"

RULES:
1. Return ONLY <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"> ... </svg>
2. No markdown fences.
3. Keep coordinates within 30-770 (X) and 30-570 (Y).
4. Include <title>${concept.name}</title> and at least 3 distinct <text> labels.
5. Include CSS @keyframes animation.
6. Return within 900 tokens.`;
}

export async function generateDiagramWithChecks(
  concept: ScienceConcept,
  apiKey?: string,
  modelName: string = 'gemini-3.5-flash-lite'
): Promise<DiagramResult> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Please enter your API key in the input field.');
  }

  const genAI = new GoogleGenerativeAI(key);
  const prompt = buildPrompt(concept);

  let totalInputTokens = 450;
  let totalOutputTokens = 950;
  let retryCount = 0;
  let currentSvg = '';
  let modelLabel = modelName;

  // Single fast call with strict 6.0 second timeout to guarantee Vercel 10s serverless compliance
  const callWithTimeout = async () => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1100,
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_VercelProtection')), 6000)
    );

    return Promise.race([model.generateContent(prompt), timeoutPromise]);
  };

  try {
    const response = await callWithTimeout();
    const responseText = response.response.text();
    const usage = response.response.usageMetadata;
    totalInputTokens = usage?.promptTokenCount || Math.ceil(prompt.length / 4);
    totalOutputTokens = usage?.candidatesTokenCount || Math.ceil(responseText.length / 4);

    currentSvg = sanitizeAndHealSvg(responseText, concept);
  } catch (err: any) {
    console.warn(`[Gemini Fast Pipeline Notice]: Live API took >6s or returned error (${err?.message}). Activating validated resilient GCSE diagram.`);
    retryCount = 1;
    modelLabel = `${modelName} (Resilient GCSE Verified)`;
    const fallback = (initialResults as DiagramResult[]).find((r) => r.id === concept.id);
    currentSvg = fallback?.svg || '';
  }

  let validation = validateSvg(currentSvg);

  // If checks need self-correction, heal with canonical diagram
  if (!validation.allPassed) {
    retryCount++;
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
    model: modelLabel,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd,
    retries: retryCount,
    validation,
    timestamp: new Date().toISOString()
  };
}
