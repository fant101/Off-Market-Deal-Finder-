import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function callClaudeWithWebSearch(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: systemPrompt,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 20,
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(response);
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(response);
}
