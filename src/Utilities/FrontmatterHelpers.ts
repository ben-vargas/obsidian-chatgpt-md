import { AI_SERVICE_OPENAI } from "src/Constants";
import { findProviderDefinition, getProviderDefinitions } from "src/Services/Providers/ProviderRegistry";

/** Get provider defaults, falling back to OpenAI for legacy unprefixed models. */
export function getDefaultConfigForService(serviceType: string): Record<string, unknown> {
  return (
    findProviderDefinition(serviceType)?.defaultConfig || findProviderDefinition(AI_SERVICE_OPENAI)?.defaultConfig || {}
  );
}

export function getDefaultModelForService(serviceType: string): string {
  const model = getDefaultConfigForService(serviceType).model;
  return typeof model === "string" ? model : "";
}

/** Resolve provider-specific URL fields; generic selected-provider `url` is handled by SettingsService. */
export function getApiUrlsFromFrontmatter(frontmatter: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    getProviderDefinitions().map((provider) => {
      const configuredUrl = frontmatter[provider.urlSetting];
      return [provider.id, typeof configuredUrl === "string" && configuredUrl ? configuredUrl : provider.defaultUrl];
    })
  );
}

/** Check whether a title exactly matches the configured timestamp token format. */
export function isTitleTimestampFormat(title: string = "", dateFormat: string): boolean {
  if (!title || !dateFormat) return false;

  const pattern = dateFormat
    .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    .replace("YYYY", "\\d{4}")
    .replace("MM", "\\d{2}")
    .replace("DD", "\\d{2}")
    .replace("hh", "\\d{2}")
    .replace("mm", "\\d{2}")
    .replace("ss", "\\d{2}");

  return title.length === dateFormat.length && new RegExp(`^${pattern}$`).test(title);
}
