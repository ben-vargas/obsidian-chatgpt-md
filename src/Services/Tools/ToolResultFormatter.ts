import { WebSearchResult } from "src/Models/Tool";

export type ToolContextMessage = { role: "user"; content: string };

export function vaultFileContext(path: string, content: string): ToolContextMessage {
  return { role: "user", content: `[vault_search result]\n\nFile: ${path}\n\n${content}` };
}

export function noVaultResultsContext(query: string): ToolContextMessage {
  return {
    role: "user",
    content: `[vault_search result - no files found]\n\nThe search for "${query}" returned no results. Try searching with different keywords or single words.`,
  };
}

export function fileReadContext(path: string, content: string): ToolContextMessage {
  return { role: "user", content: `[file_read result]\n\nFile: ${path}\n\n${content}` };
}

export function webResultContext(result: WebSearchResult): ToolContextMessage {
  return {
    role: "user",
    content: `[web_search result]\n\nTitle: ${result.title}\nURL: ${result.url}\n\n${result.content || result.snippet}`,
  };
}

export function noWebResultsContext(query: string, hadUnapprovedResults: boolean): ToolContextMessage {
  return hadUnapprovedResults
    ? {
        role: "user",
        content: `[web_search result - no results selected]\n\nThe web search for "${query}" returned results, but none were approved for sharing.`,
      }
    : {
        role: "user",
        content: `[web_search result - no results found]\n\nThe web search for "${query}" returned no results. Try different search terms.`,
      };
}
