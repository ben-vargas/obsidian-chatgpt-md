import type { App, SecretComponent } from "obsidian";
import { ChatGPT_MDSettings } from "src/Models/Config";
import {
  CredentialDefinition,
  findProviderDefinition,
  getCredentialDefinitions,
  WEB_SEARCH_CREDENTIAL,
} from "./Providers/ProviderRegistry";

const SECRET_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SecretComponentConstructor = new (app: App, containerEl: HTMLElement) => SecretComponent;

interface SecretStorageCapability {
  setSecret(id: string, secret: string): void;
  getSecret(id: string): unknown;
  listSecrets(): unknown;
}

export type CredentialMigrationStatus = "migrated" | "failed" | "preserved" | "skipped";

export interface CredentialMigrationResult {
  category: CredentialDefinition["category"];
  status: CredentialMigrationStatus;
}

export interface CredentialMigrationSummary {
  supported: boolean;
  results: CredentialMigrationResult[];
}

export function isValidApiKey(apiKey: unknown): apiKey is string {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function isValidSecretId(value: unknown): value is string {
  return typeof value === "string" && SECRET_ID_PATTERN.test(value);
}

function isConstructible(value: unknown): value is SecretComponentConstructor {
  if (typeof value !== "function") return false;
  try {
    Reflect.construct(String, [], value);
    return true;
  } catch {
    return false;
  }
}

function getStorage(app: unknown): SecretStorageCapability | null {
  if (!app || typeof app !== "object") return null;
  try {
    const storage = (app as { secretStorage?: unknown }).secretStorage;
    if (!storage || typeof storage !== "object") return null;
    const candidate = storage as Record<string, unknown>;
    if (
      typeof candidate.setSecret !== "function" ||
      typeof candidate.getSecret !== "function" ||
      typeof candidate.listSecrets !== "function"
    ) {
      return null;
    }
    return storage as SecretStorageCapability;
  } catch {
    return null;
  }
}

/** Owns capability checks, opaque reference resolution, and safe plaintext migration. */
export class ApiAuthService {
  private readonly storage: SecretStorageCapability | null;
  private readonly secretComponent: SecretComponentConstructor | null;

  constructor(app?: unknown, secretComponent?: unknown) {
    this.storage = getStorage(app);
    this.secretComponent = isConstructible(secretComponent) ? secretComponent : null;
  }

  isSecureStorageSupported(): boolean {
    return this.storage !== null && this.secretComponent !== null;
  }

  getSecretComponentConstructor(): SecretComponentConstructor | null {
    return this.isSecureStorageSupported() ? this.secretComponent : null;
  }

  getApiKey(settings: ChatGPT_MDSettings, serviceType: string): string {
    return this.resolveProviderCredential(settings, serviceType);
  }

  resolveProviderCredential(settings: ChatGPT_MDSettings, serviceType: string): string {
    const definition = findProviderDefinition(serviceType)?.credential;
    return definition ? this.resolveCredential(settings, definition) : "";
  }

  resolveWebSearchCredential(settings: ChatGPT_MDSettings): string {
    return this.resolveCredential(settings, WEB_SEARCH_CREDENTIAL);
  }

  hasValidReference(settings: ChatGPT_MDSettings, definition: CredentialDefinition): boolean {
    if (!this.isSecureStorageSupported()) return false;
    return this.resolveReference(settings[definition.secretIdSetting]) !== "";
  }

  async migrateLegacyCredentials(
    settings: ChatGPT_MDSettings,
    persist: () => Promise<void>
  ): Promise<CredentialMigrationSummary> {
    if (!this.isSecureStorageSupported()) return { supported: false, results: [] };

    const results: CredentialMigrationResult[] = [];
    for (const definition of getCredentialDefinitions()) {
      results.push(await this.migrateCredential(settings, definition, persist));
    }
    return { supported: true, results };
  }

  private resolveCredential(settings: ChatGPT_MDSettings, definition: CredentialDefinition): string {
    const legacy = settings[definition.legacySetting];
    if (!this.isSecureStorageSupported()) return isValidApiKey(legacy) ? legacy : "";

    const resolved = this.resolveReference(settings[definition.secretIdSetting]);
    if (resolved) return resolved;
    return isValidApiKey(legacy) ? legacy : "";
  }

  private resolveReference(reference: unknown): string {
    if (!this.storage || !isValidSecretId(reference)) return "";
    try {
      const secret = this.storage.getSecret(reference);
      return isValidApiKey(secret) ? secret : "";
    } catch {
      return "";
    }
  }

  private async migrateCredential(
    settings: ChatGPT_MDSettings,
    definition: CredentialDefinition,
    persist: () => Promise<void>
  ): Promise<CredentialMigrationResult> {
    const legacy = settings[definition.legacySetting];
    if (!isValidApiKey(legacy)) return { category: definition.category, status: "skipped" };
    if (this.hasValidReference(settings, definition)) {
      return { category: definition.category, status: "preserved" };
    }

    const oldReference = settings[definition.secretIdSetting];
    try {
      this.storage!.setSecret(definition.ownedSecretId, legacy);
      this.assign(settings, definition.secretIdSetting, definition.ownedSecretId);
      this.assign(settings, definition.legacySetting, "");
      await persist();
      return { category: definition.category, status: "migrated" };
    } catch {
      this.assign(settings, definition.secretIdSetting, oldReference);
      this.assign(settings, definition.legacySetting, legacy);
      return { category: definition.category, status: "failed" };
    }
  }

  private assign(settings: ChatGPT_MDSettings, key: keyof ChatGPT_MDSettings, value: unknown): void {
    (settings as unknown as Record<string, unknown>)[key] = value;
  }
}
