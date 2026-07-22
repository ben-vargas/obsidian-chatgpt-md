import { DEFAULT_SETTINGS } from "src/Models/Config";
import { SettingsMigrationService } from "./SettingsMigration";

describe("SettingsMigrationService", () => {
  it("normalizes historical URL suffixes idempotently", () => {
    const settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      ollamaUrl: "http://localhost:11434/api/",
      openrouterUrl: "https://openrouter.ai/api/",
      openaiUrl: "https://api.openai.com/",
    };
    const update = (changes: Partial<typeof settings>) => Object.assign(settings, changes);
    const migrations = new SettingsMigrationService();

    expect(migrations.migrateSettings(settings, update)).toBe(true);
    expect(settings).toMatchObject({
      ollamaUrl: "http://localhost:11434",
      openrouterUrl: "https://openrouter.ai",
      openaiUrl: "https://api.openai.com",
    });
    expect(migrations.migrateSettings(settings, update)).toBe(false);
  });

  it("does not overwrite a customized plugin system message", () => {
    const settings = { ...structuredClone(DEFAULT_SETTINGS), pluginSystemMessage: "My custom instructions" };
    const update = (changes: Partial<typeof settings>) => Object.assign(settings, changes);

    expect(new SettingsMigrationService().migrateSettings(settings, update)).toBe(false);
    expect(settings.pluginSystemMessage).toBe("My custom instructions");
  });
});
