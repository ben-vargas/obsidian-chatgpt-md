import { jest } from "@jest/globals";
import { EditorService } from "./EditorService";

describe("EditorService.clearChat", () => {
  it("preserves the original complex frontmatter block byte-for-byte", async () => {
    const original = `---\nsystem_commands:\n  - "Use: colons"\ntags: [one, two]\nnested:\n  key: value\n---\n\nuser content`;
    const editor = {
      getValue: jest.fn(() => original),
      setValue: jest.fn(),
      setCursor: jest.fn(),
      lastLine: jest.fn(() => 6),
    };
    const service = new EditorService({} as never, {} as never, {} as never);

    await service.clearChat(editor as never);

    expect(editor.setValue).toHaveBeenCalledWith(
      `---\nsystem_commands:\n  - "Use: colons"\ntags: [one, two]\nnested:\n  key: value\n---\n\n`
    );
  });

  it("clears a note without frontmatter", async () => {
    const editor = {
      getValue: jest.fn(() => "user content"),
      setValue: jest.fn(),
      setCursor: jest.fn(),
      lastLine: jest.fn(() => 0),
    };
    const service = new EditorService({} as never, {} as never, {} as never);

    await service.clearChat(editor as never);

    expect(editor.setValue).toHaveBeenCalledWith("");
    expect(editor.setCursor).toHaveBeenCalledWith({ line: 0, ch: 0 });
  });
});
