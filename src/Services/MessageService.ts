import { Editor } from "obsidian";
import { Message } from "src/Models/Message";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { FileService } from "./FileService";
import { NotificationService } from "./NotificationService";
import { HORIZONTAL_LINE_MD, NEWLINE, ROLE_ASSISTANT, ROLE_IDENTIFIER, ROLE_USER } from "src/Constants";
import { Logger } from "src/Utilities/Logger";
import {
  escapeRegExp,
  extractRoleAndMessage as extractRoleAndMessageUtil,
  getHeaderRole,
  getHeadingPrefix,
} from "../Utilities/TextHelpers";
import {
  findLinksInMessage,
  removeCommentBlocks,
  removeYAMLFrontMatter,
  splitMessages,
} from "../Utilities/MessageHelpers";

/**
 * Service responsible for all message-related operations
 * Now uses utility functions for common operations
 */
interface AiResponse {
  fullString: string;
  mode: string;
  wasAborted?: boolean;
  model?: string;
}

export class MessageService {
  constructor(
    private fileService: FileService,
    private notificationService: NotificationService
  ) {}

  /**
   * Clean messages from the editor content
   */
  cleanMessagesFromNote(editor: Editor): string[] {
    const messages = splitMessages(removeYAMLFrontMatter(editor.getValue()));
    return messages.map(removeCommentBlocks);
  }

  /**
   * Get messages from the editor
   */
  async getMessagesFromEditor(
    editor: Editor,
    settings: ChatGPT_MDSettings
  ): Promise<{
    messages: string[];
    messagesWithRole: Message[];
  }> {
    let messages = this.cleanMessagesFromNote(editor);

    messages = await Promise.all(
      messages.map(async (message) => {
        const links = findLinksInMessage(message);
        for (const link of links) {
          try {
            let content = await this.fileService.getLinkedNoteContent(link.title);

            if (content) {
              // remove the assistant and user delimiters
              // if the inlined note was already a chat
              const regex = new RegExp(
                `${NEWLINE}${HORIZONTAL_LINE_MD}${NEWLINE}#+ ${ROLE_IDENTIFIER}(?:${ROLE_USER}|${ROLE_ASSISTANT}).*$`,
                "gm"
              );
              content = content?.replace(regex, "");
              content = removeYAMLFrontMatter(content) || null;

              message = message.replace(
                new RegExp(escapeRegExp(link.link), "g"),
                `${NEWLINE}${link.title}${NEWLINE}${content}${NEWLINE}`
              );
            } else {
              Logger.warn(`Error fetching linked note content for: ${link.link}`);
            }
          } catch (error) {
            Logger.error("Error expanding linked note", { error, link: link.title });
          }
        }

        return message;
      })
    );

    // Extract roles from each message
    const messagesWithRole = messages.map(extractRoleAndMessageUtil);

    return { messages, messagesWithRole };
  }

  /**
   * Process an AI response and update the editor
   */
  processResponse(editor: Editor, response: AiResponse, settings: ChatGPT_MDSettings): void {
    if (response.mode === "streaming") {
      // Only add user section if streaming was not aborted
      if (!response.wasAborted) {
        this.processStreamingResponse(editor, settings);
      }
    } else {
      this.processStandardResponse(editor, response, settings);
    }
  }

  /**
   * Process a streaming response by adding user delimiter
   */
  private processStreamingResponse(editor: Editor, settings: ChatGPT_MDSettings): void {
    const headingPrefix = getHeadingPrefix(settings.headingLevel);
    const userHeader = getHeaderRole(headingPrefix, ROLE_USER);

    // Get cursor position set by ApiResponseParser after streaming completes
    const cursorBeforeHeader = editor.getCursor();

    // Insert user header at current position
    editor.replaceRange(userHeader, cursorBeforeHeader);

    // Calculate cursor position after the inserted header
    const newCursor = editor.offsetToPos(editor.posToOffset(cursorBeforeHeader) + userHeader.length);

    // Set cursor to end of inserted content
    editor.setCursor(newCursor);
  }

  /**
   * Process a standard (non-streaming) response
   */
  private processStandardResponse(editor: Editor, response: AiResponse, settings: ChatGPT_MDSettings): void {
    const responseStr = response.fullString || "[No response]";
    const model = response.model;

    const headingPrefix = getHeadingPrefix(settings.headingLevel);
    const assistantHeader = getHeaderRole(headingPrefix, ROLE_ASSISTANT, model);
    const userHeader = getHeaderRole(headingPrefix, ROLE_USER);

    // Get cursor position before insertion
    const cursorBeforeInsertion = editor.getCursor();
    const fullContent = `${assistantHeader}${responseStr}${userHeader}`;

    // Insert full response content
    editor.replaceRange(fullContent, cursorBeforeInsertion);

    // Calculate final cursor position using offset API
    const newCursor = editor.offsetToPos(editor.posToOffset(cursorBeforeInsertion) + fullContent.length);

    // Set cursor to end of inserted content
    editor.setCursor(newCursor);
  }
}
