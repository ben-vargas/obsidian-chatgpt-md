import { App } from "obsidian";

import { FolderCreationModal } from "src/Views/FolderCreationModal";

import { Logger } from "src/Utilities/Logger";
export const createFolderModal = async (app: App, folderName: string, folderPath: string): Promise<boolean> => {
  const folderCreationModal = new FolderCreationModal(app, folderName, folderPath);

  folderCreationModal.open();
  const result = await folderCreationModal.waitForModalValue();

  if (result) {
    Logger.debug("[ChatGPT MD] Creating folder");
    await app.vault.createFolder(folderPath);
  } else {
    Logger.debug("[ChatGPT MD] Not creating folder");
  }

  return result;
};
