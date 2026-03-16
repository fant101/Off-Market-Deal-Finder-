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
        type: "web_search" as never,
        name: "web_search",
        max_uses: 20,
      } as never,
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlocks = response.content.filter(
    (block) => block.type === "text"
  );
  return textBlocks.map((block) => {
    if (block.type === "text") return block.text;
    return "";
  }).join("\n");
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

  const textBlocks = response.content.filter(
    (block) => block.type === "text"
  );
  return textBlocks.map((block) => {
    if (block.type === "text") return block.text;
    return "";
  }).join("\n");
}
