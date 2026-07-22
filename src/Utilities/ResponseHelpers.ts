import { Editor } from "obsidian";
import { ROLE_ASSISTANT } from "src/Constants";
import { getHeaderRole } from "src/Utilities/TextHelpers";

/** Insert the assistant header and return cursor positions used by streaming. */
export function insertAssistantHeader(
  editor: Editor,
  headingPrefix: string,
  model: string
): {
  initialCursor: { line: number; ch: number };
  newCursor: { line: number; ch: number };
} {
  const header = getHeaderRole(headingPrefix, ROLE_ASSISTANT, model);
  const initialCursor = editor.getCursor();
  editor.replaceRange(header, initialCursor);

  const newCursor = editor.offsetToPos(editor.posToOffset(initialCursor) + header.length);
  editor.setCursor(newCursor);
  return { initialCursor, newCursor };
}
