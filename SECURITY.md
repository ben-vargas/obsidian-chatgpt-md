# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories for `bramses/chatgpt-md`. Do not open a public issue for an approval bypass, credential leak, or unintended vault-data disclosure.

Include the affected plugin and Obsidian versions, provider, reproduction steps, and sanitized configuration. Never include real API keys or private note contents.

Security-sensitive reports include:

- bypassing tool execution or result-selection approval;
- sending unselected vault or web data to a model;
- exposing API keys in logs, errors, or requests to the wrong provider;
- provider/base-URL confusion that sends data or credentials to an unintended host;
- unsafe handling of linked notes, custom search endpoints, or plugin data;
- exploitable dependency vulnerabilities.

The maintainers will acknowledge and triage reports as availability permits and coordinate disclosure after a fix is available.

## Data and credential model

- Provider and web-search API keys are stored in Obsidian's local plugin data. They are not stored in an operating-system keychain.
- Cloud-provider chats send conversation text and expanded linked-note content to the selected provider.
- Ollama and LM Studio remain local only when their configured URLs point to local services.
- AI tools require approval before execution. Vault and web-search results require selection before their content is sent back to the model.
- Custom web-search endpoints receive the search query and, when configured, a bearer credential.
- Debug logs are designed not to include credentials, prompts, note bodies, or tool-result contents. Review and sanitize logs before sharing them.
