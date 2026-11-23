import { NextRequest, NextResponse } from 'next/server';
import { SCIENCE_CONCEPTS } from '../../../lib/concepts';
import { generateDiagramWithChecks } from '../../../lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conceptId, customKey, model } = body;

    const concept = SCIENCE_CONCEPTS.find((c) => c.id === Number(conceptId));
    if (!concept) {
      return NextResponse.json(
        { error: `Invalid concept ID: ${conceptId}. Please select a valid concept (1 to 5).` },
        { status: 400 }
      );
    }

    const apiKey = customKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured on the server.',
          hint: 'To test live generation, please provide a free Gemini API key in the API Key input box or configure GEMINI_API_KEY as an environment variable in Vercel/host.'
        },
        { status: 401 }
      );
    }

    const chosenModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    console.log(`[API /api/generate] Starting live generation for Concept ${concept.id} using model ${chosenModel}`);

    const result = await generateDiagramWithChecks(concept, apiKey, chosenModel);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[API /api/generate Error]:', error);
    const status = error?.status || 500;
    const message = error?.message || 'An unexpected error occurred during generation.';

    let friendlyMessage = message;
    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      friendlyMessage = 'The provided Google Gemini API key is invalid. Please verify your key at https://aistudio.google.com/api-keys';
    } else if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      friendlyMessage = 'Gemini API free tier rate limit exceeded (429 Quota Exhausted). Please wait 30-60 seconds and retry.';
    } else if (message.includes('503')) {
      friendlyMessage = 'Google Gemini service is temporarily unavailable (503). Retried 3 times without recovery.';
    }

    return NextResponse.json(
      {
        error: friendlyMessage,
        raw: message,
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
