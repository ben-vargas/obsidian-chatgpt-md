import { MergedFrontmatterConfig } from "src/Models/Config";
import { Message } from "src/Models/Message";

export interface PreparedAiSdkPrompt {
  instructions?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Build the system context for a chat request.
 *
 * The plugin-level message is always included first, followed by agent context
 * and effective frontmatter commands.
 */
export function buildChatSystemMessages(
  pluginSystemMessage: string | undefined,
  frontmatter: MergedFrontmatterConfig
): Message[] {
  const messages: Message[] = [];

  if (pluginSystemMessage?.trim()) {
    messages.push({ role: "system", content: pluginSystemMessage });
  }

  const agentBody = frontmatter._agentSystemMessage;
  if (typeof agentBody === "string" && agentBody.trim()) {
    messages.push({ role: "system", content: agentBody });
  }

  if (Array.isArray(frontmatter.system_commands)) {
    for (const command of frontmatter.system_commands) {
      if (typeof command === "string" && command.trim()) {
        messages.push({ role: "system", content: command });
      }
    }
  }

  return messages;
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
