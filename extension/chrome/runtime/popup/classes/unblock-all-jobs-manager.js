import { getBackupValues, getBlockedValues } from "../../modules/storage.js";

class UnblockAllJobsManager {
  jobBoardLogo = document.querySelector(
    ".options-for-job-board .job-board-name"
  );
  unblockButton = document.querySelector("#unhide-all-jobs");
  undoButton = document.querySelector("#undo-unhide-all-jobs");

  constructor(jobBoard, storage) {
    this.jobBoard = jobBoard;
    this.unblockButton.addEventListener("click", () => this.unblock());
    this.undoButton.addEventListener("click", () => this.undoUnblock());
    this.jobBoardLogo.setAttribute("src", jobBoard.logo.src);
    this.jobBoardLogo.setAttribute("alt", jobBoard.logo.alt);
    this.jobBoardLogo.style.setProperty("background", jobBoard.logo.brandColor);
    this.updateButtons(storage);

    chrome.storage.local.onChanged.addListener((changes) => {
      const syncIdIsTheOnlyChange =
        Object.hasOwn(changes, "syncId") && Object.keys(changes).length === 1;
      if (syncIdIsTheOnlyChange) return;
      this.updateButtons();
    });
  }

  async updateButtons(storage) {
    storage = storage || (await chrome.storage.local.get());

    const [allBlockedValues, allBackupValues] = await Promise.all([
      getBlockedValues(this.jobBoard.id, storage),
      getBackupValues(this.jobBoard.id, storage),
    ]);

    const hasBlockedValues = Object.values(allBlockedValues).some(
      (blockedValues) => blockedValues.length
    );

    const hasBackupValues = Object.values(allBackupValues).some(
      (backupValues) => backupValues.length
    );

    if (hasBlockedValues && !hasBackupValues) {
      this.unblockButton.disabled = false;
      this.undoButton.disabled = true;
    } else if (!hasBlockedValues && hasBackupValues) {
      this.unblockButton.disabled = true;
      this.undoButton.disabled = false;
    } else if (!hasBlockedValues && !hasBackupValues) {
      this.unblockButton.disabled = true;
      this.undoButton.disabled = true;
    }
  }

  async unblock() {
    this.unblockButton.disabled = true;

    const allBlockedValues = Object.entries(
      await getBlockedValues(this.jobBoard.id)
    );

    if (!allBlockedValues.length) return;

    const storageChangesToSet = Object.fromEntries([
      ...allBlockedValues.map(([key]) => [key, []]),
      ...allBlockedValues.map(([key, value]) => [`${key}.backup`, value]),
    ]);

    chrome.storage.local.set(storageChangesToSet);
  }

  async undoUnblock() {
    this.undoButton.disabled = true;

    const allBackupValues = Object.entries(
      await getBackupValues(this.jobBoard.id)
    );

    if (!allBackupValues.length) return;

    const storageChangesToSet = Object.fromEntries([
      ...allBackupValues.map(([key]) => [key, []]),
      ...allBackupValues.map(([key, value]) => [
        key.replace(".backup", ""),
        value,
      ]),
    ]);

    chrome.storage.local.set(storageChangesToSet);
  }
}

export { UnblockAllJobsManager };
