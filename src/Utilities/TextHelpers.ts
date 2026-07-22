import {
  HORIZONTAL_LINE_MD,
  MAX_HEADING_LEVEL,
  NEWLINE,
  ROLE_ASSISTANT,
  ROLE_DEVELOPER,
  ROLE_IDENTIFIER,
  ROLE_USER,
} from "src/Constants";

const cleanupRole = (role: string): string => {
  const trimmedRole = role.trim().toLowerCase();

  const roles = [ROLE_USER, ROLE_ASSISTANT, ROLE_DEVELOPER];

  const foundRole = roles.find((r) => trimmedRole.includes(r));

  if (foundRole) {
    return foundRole;
  }

  throw new Error(`Failed to extract role from input: "${role}"`);
};

export const extractRoleAndMessage = (message: string) => {
  try {
    if (!message.includes(ROLE_IDENTIFIER)) {
      return {
        role: ROLE_USER,
        content: message,
      };
    }

    const [roleSection, ...contentSections] = message.split(ROLE_IDENTIFIER)[1].split("\n");

    const cleanedRole = cleanupRole(roleSection);

    return {
      role: cleanedRole,
      content: contentSections.join("\n").trim(),
    };
  } catch (error) {
    throw new Error(`Failed to extract role and message: ${error}`);
  }
};

export const getHeadingPrefix = (headingLevel: number) => {
  if (headingLevel === 0) {
    return "";
  } else if (headingLevel > MAX_HEADING_LEVEL) {
    return "#".repeat(MAX_HEADING_LEVEL) + " ";
  }
  return "#".repeat(headingLevel) + " ";
};

export const getHeaderRole = (headingPrefix: string, role: string, model?: string) =>
  `${NEWLINE}${HORIZONTAL_LINE_MD}${NEWLINE}${headingPrefix}${ROLE_IDENTIFIER}${role}${model ? `<span style="font-size: small;"> (${model})</span>` : ``}${NEWLINE}`;

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
