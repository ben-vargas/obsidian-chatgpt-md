export interface TextStreamSink {
  appendText(text: string): void;
}

export interface ConsumeStreamOptions {
  isAborted: () => boolean;
  trimLeadingWhitespace?: boolean;
  initialText?: string;
}

/** Consume an AI SDK text stream without depending on Obsidian or a provider. */
export async function consumeTextStream(
  textStream: AsyncIterable<string>,
  sink: TextStreamSink,
  options: ConsumeStreamOptions
): Promise<string> {
  let text = options.initialText || "";
  let hasContent = text.length > 0 || !options.trimLeadingWhitespace;

  for await (const chunk of textStream) {
    if (options.isAborted()) break;
    const output = hasContent ? chunk : chunk.trimStart();
    if (!output) continue;
    hasContent = true;
    text += output;
    sink.appendText(output);
  }

  return text;
}
