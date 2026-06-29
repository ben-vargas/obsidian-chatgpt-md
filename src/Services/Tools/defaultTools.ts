import { App } from "obsidian";
import { z } from "zod";
import { tool, zodSchema } from "ai";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { RegisteredTool } from "src/Models/Tool";
import { VaultSearchService } from "src/Services/VaultSearchService";
import { WebSearchService } from "src/Services/WebSearchService";

interface DefaultToolsContext {
  app: App;
  settings: ChatGPT_MDSettings;
  vaultSearchService: VaultSearchService;
  webSearchService: WebSearchService;
}

export function createDefaultTools(context: DefaultToolsContext): Map<string, RegisteredTool> {
  return new Map([
    ["vault_search", createVaultSearchTool(context)],
    ["file_read", createFileReadTool(context)],
    ["web_search", createWebSearchTool(context)],
  ]);
}

function createVaultSearchTool({ app, vaultSearchService }: DefaultToolsContext): RegisteredTool {
  return tool({
    description:
      "Search the Obsidian vault for files by name or content. Returns file paths, names, and content previews. Use this to find relevant notes before reading them.",
    inputSchema: zodSchema(
      z.object({
        query: z
          .string()
          .describe(
            "The search query to find files. Can be keywords, topics, or phrases to search for in file names and content."
          ),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of search results to return. Default is 10, maximum is 50."),
      })
    ),
    execute: async (args: { query: string; limit?: number }) => {
      const results = await vaultSearchService.searchVault(args, { app, toolCallId: "", messages: [] });
      return results.map((result) => ({ ...result, path: `[${result.basename}](${result.path})` }));
    },
  }) as unknown as RegisteredTool;
}

function createFileReadTool({ app, vaultSearchService }: DefaultToolsContext): RegisteredTool {
  return tool({
    description:
      "Read the full contents of specific files from the vault. User will be asked to approve which files to share. Use this after searching to get complete file contents.",
    inputSchema: zodSchema(
      z.object({
        filePaths: z
          .array(z.string())
          .describe("Array of file paths to read. Use the paths returned from vault_search."),
      })
    ),
    execute: async (args: { filePaths: string[] }) => {
      return await vaultSearchService.readFiles(args, { app, toolCallId: "", messages: [] });
    },
  }) as unknown as RegisteredTool;
}

function createWebSearchTool({ settings, webSearchService }: DefaultToolsContext): RegisteredTool {
  return tool({
    description:
      "Search the web for information on a topic. Returns titles, URLs, and snippets from search results. User will be asked to approve which results to share.",
    inputSchema: zodSchema(
      z.object({
        query: z.string().describe("The search query to look up on the web"),
        limit: z
          .number()
          .optional()
          .default(5)
          .describe("Maximum number of search results to return. Default is 5, maximum is 10."),
      })
    ),
    execute: async (args: { query: string; limit?: number }) => {
      return await webSearchService.searchWeb(
        args,
        settings.webSearchProvider,
        settings.webSearchApiKey,
        settings.webSearchApiUrl
      );
    },
  }) as unknown as RegisteredTool;
}
