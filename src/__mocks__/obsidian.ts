// Mock Obsidian API for testing
import { jest } from "@jest/globals";

export class App {
  workspace = {
    getActiveViewOfType: jest.fn(),
    getActiveFile: jest.fn(),
  };
  vault = {
    read: jest.fn(),
    modify: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getFiles: jest.fn(() => []),
  };
  metadataCache = {
    getFileCache: jest.fn(),
  };
}

export class Plugin {
  app: App;
  manifest = {
    id: "chatgpt-md",
    name: "ChatGPT MD",
    version: "3.0.0",
  };

  constructor(app: App) {
    this.app = app;
  }

  loadData = jest.fn();
  saveData = jest.fn();
  addCommand = jest.fn();
  addSettingTab = jest.fn();
  registerEvent = jest.fn();
}

export class Editor {
  getValue = jest.fn();
  setValue = jest.fn();
  getCursor = jest.fn(() => ({ line: 0, ch: 0 }));
  setCursor = jest.fn();
  replaceRange = jest.fn();
  getLine = jest.fn(() => "");
  lastLine = jest.fn(() => 0);
  lineCount = jest.fn(() => 1);
  posToOffset = jest.fn((pos: EditorPosition) => pos.line * 100 + pos.ch);
  offsetToPos = jest.fn((offset: number) => ({ line: Math.floor(offset / 100), ch: offset % 100 }));
  getRange = jest.fn(() => "");
  replaceSelection = jest.fn();
  somethingSelected = jest.fn(() => false);
}

export class MarkdownView {
  file = { basename: "test", path: "test.md", name: "test.md" };
  editor = new Editor();

  getViewType(): string {
    return "markdown";
  }
}

export class Notice {
  constructor(message: string, duration?: number) {
    // Silent in tests
  }
}

export class Modal {
  app: App;
  containerEl: HTMLElement = document.createElement("div");

  constructor(app: App) {
    this.app = app;
  }

  open = jest.fn();
  close = jest.fn();
  onOpen = jest.fn();
  onClose = jest.fn();
}

export class Setting {
  setName = jest.fn(() => this);
  setDesc = jest.fn(() => this);
  addText = jest.fn(() => this);
  addTextArea = jest.fn(() => this);
  addToggle = jest.fn(() => this);
  addDropdown = jest.fn(() => this);
  addButton = jest.fn(() => this);
  setClass = jest.fn(() => this);
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement = document.createElement("div");

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  display = jest.fn();
  hide = jest.fn();
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isLinux: false,
  isMacOS: true,
  isWin: false,
};

export class TFile {
  path: string;
  basename: string;
  name: string;
  extension: string;
  stat = { ctime: 0, mtime: 0, size: 0 };

  constructor(path: string) {
    this.path = path;
    const parts = path.split("/");
    const filename = parts[parts.length - 1];
    const nameParts = filename.split(".");
    this.extension = nameParts.length > 1 ? nameParts.pop()! : "";
    this.basename = nameParts.join(".");
    this.name = filename;
  }
}

export class TFolder {
  path: string;
  name: string;
  children: (TFile | TFolder)[] = [];

  constructor(path: string) {
    this.path = path;
    const parts = path.split("/");
    this.name = parts[parts.length - 1];
  }
}

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface EditorRange {
  from: EditorPosition;
  to: EditorPosition;
}

// Mock requestUrl for API calls
export const requestUrl = jest.fn(() =>
  Promise.resolve({
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    json: {},
    text: "",
  })
);

// Mock normalizePath
export const normalizePath = jest.fn((path: string) => path);

// Lightweight YAML mocks for utility tests. Production uses Obsidian's parser.
export function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let arrayKey: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (arrayKey && line.startsWith("-")) {
      const values = result[arrayKey] as string[];
      values.push(unquote(line.slice(1).trim()));
      continue;
    }
    arrayKey = null;

    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();

    if (!rawValue) {
      result[key] = [];
      arrayKey = key;
    } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1);
      result[key] = inner ? inner.split(",").map((value) => unquote(value.trim())) : [];
    } else if (rawValue === "true" || rawValue === "false") {
      result[key] = rawValue === "true";
    } else if (rawValue === "null") {
      result[key] = null;
    } else if (rawValue !== "" && Number.isFinite(Number(rawValue))) {
      result[key] = Number(rawValue);
    } else {
      result[key] = unquote(rawValue);
    }
  }

  return result;
}

function unquote(value: string): string {
  const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  return quoted ? value.slice(1, -1) : value;
}

// Mock moment (used in some utilities)
export const moment = jest.fn(() => ({
  format: jest.fn(() => "2024-02-08"),
}));
