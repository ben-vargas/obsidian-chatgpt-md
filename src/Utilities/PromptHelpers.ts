import { Message } from "src/Models/Message";

export interface PreparedAiSdkPrompt {
  instructions?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Convert plugin messages to the AI SDK 7 prompt shape.
 *
 * AI SDK 7 rejects system/developer entries in `messages`; they must be sent
 * through the top-level `instructions` option instead.
 */
export function prepareAiSdkPrompt(messages: Message[]): PreparedAiSdkPrompt {
  const instructionParts: string[] = [];
  const conversationMessages: PreparedAiSdkPrompt["messages"] = [];

  for (const message of messages) {
    if (message.role === "system" || message.role === "developer") {
      if (message.content.trim()) {
        instructionParts.push(message.content);
      }
      continue;
    }

    conversationMessages.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    });
  }

  const instructions = instructionParts.join("\n\n");
  return {
    ...(instructions ? { instructions } : {}),
    messages: conversationMessages,
  };
}
