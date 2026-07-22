import { parseYaml } from "obsidian";

/** Remove leading YAML frontmatter from a note. */
export function removeYAMLFrontMatter(note: string | undefined): string | undefined {
  if (!note) return note;
  const match = note.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/);
  return match ? note.slice(match[0].length).trim() : note;
}

/** Parse a complete frontmatter template using Obsidian's YAML implementation. */
export function parseSettingsFrontmatter(yamlString: string): Record<string, unknown> {
  const content = yamlString.replace(/^---(?:\r?\n|$)/, "").replace(/(?:\r?\n)?---\s*$/, "");
  const parsed = parseYaml(content);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
