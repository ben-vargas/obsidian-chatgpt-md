import { consumeTextStream } from "./StreamConsumer";

async function* chunks(...values: string[]): AsyncGenerator<string> {
  for (const value of values) yield value;
}

describe("consumeTextStream", () => {
  it("trims only leading response whitespace and writes each retained chunk", async () => {
    const written: string[] = [];
    const result = await consumeTextStream(
      chunks("  ", "  hello", " world"),
      { appendText: (text) => written.push(text) },
      {
        isAborted: () => false,
        trimLeadingWhitespace: true,
      }
    );

    expect(result).toBe("hello world");
    expect(written).toEqual(["hello", " world"]);
  });

  it("stops before writing a chunk after abort", async () => {
    let checks = 0;
    const result = await consumeTextStream(
      chunks("first", "second"),
      { appendText: () => undefined },
      {
        isAborted: () => ++checks > 1,
      }
    );

    expect(result).toBe("first");
  });
});
