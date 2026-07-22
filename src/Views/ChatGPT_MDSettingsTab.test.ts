import { parseSettingValue } from "./ChatGPT_MDSettingsTab";
import { SettingDefinition } from "./settingsSchema";

function numericSetting(id: SettingDefinition["id"], name = "Value"): SettingDefinition {
  return { id, name, description: "", type: "text", valueType: "number", group: "Test" };
}

describe("parseSettingValue", () => {
  it("parses finite numeric values", () => {
    expect(parseSettingValue(numericSetting("openaiDefaultMaxTokens"), "800")).toBe(800);
  });

  it("rejects empty and non-numeric values", () => {
    expect(() => parseSettingValue(numericSetting("openaiDefaultMaxTokens"), "")).toThrow("valid number");
    expect(() => parseSettingValue(numericSetting("openaiDefaultMaxTokens"), "abc")).toThrow("valid number");
  });

  it("enforces documented ranges", () => {
    expect(parseSettingValue(numericSetting("headingLevel", "Heading Level"), "6")).toBe(6);
    expect(() => parseSettingValue(numericSetting("headingLevel", "Heading Level"), "7")).toThrow("between 0 and 6");
    expect(() => parseSettingValue(numericSetting("maxWebSearchResults"), "0")).toThrow("between 1 and 10");
  });
});
