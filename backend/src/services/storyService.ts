import OpenAI from "openai";

// Lazy initialization to allow mocking in tests
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// Allow tests to inject a mock client
export function setOpenAIClient(client: OpenAI) {
  openaiInstance = client;
}

export interface StoryGenerationParams {
  prompt: string;
  theme?: string;
  parameters?: Record<string, any>;
}

export interface GeneratedStory {
  title: string;
  content: string;
}

export async function generateStory(
  params: StoryGenerationParams
): Promise<GeneratedStory> {
  const { prompt, theme, parameters } = params;

  const systemPrompt = `You are a creative storyteller specializing in calming, sleep-inducing narratives. 
Create soothing stories that help people relax and fall asleep. The stories should be:
- Calming and peaceful
- Descriptive and immersive
- Appropriate for bedtime
- 500-1000 words in length`;

  const userPrompt = theme
    ? `Create a ${theme} themed story based on: ${prompt}`
    : `Create a story based on: ${prompt}`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const title = extractTitle(content) || "Untitled Story";

    return {
      title,
      content,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate story");
  }
}

function extractTitle(content: string): string | null {
  // Try to extract title from first line or first sentence
  const lines = content.split("\n");
  const firstLine = lines[0]?.trim();

  if (firstLine && firstLine.length < 100 && !firstLine.includes(".")) {
    return firstLine.replace(/^#+\s*/, ""); // Remove markdown headers
  }

  // Extract from first sentence
  const firstSentence = content.split(".")[0];
  if (firstSentence && firstSentence.length < 100) {
    return firstSentence.trim();
  }

  return null;
}
