import { RemoveHiddenJobsManager } from "./remove-hidden-jobs-manager.js";
import { HiddenJobsListManager } from "./hidden-jobs-list-manager.js";
import { UnblockAllJobsManager } from "./unblock-all-jobs-manager.js";
import { settingsManager } from "../../modules/settings-manager.js";

class JobBoardPopup {
  static started = false;
  static async start(jobBoard) {
    document.documentElement.setAttribute("data-job-board-id", jobBoard.id);

    if (this.started) return;
    this.started = true;

    const localStorage = await chrome.storage.local.get();
    new UnblockAllJobsManager(jobBoard, localStorage);
    new RemoveHiddenJobsManager(jobBoard, localStorage);
    new HiddenJobsListManager(jobBoard, localStorage);
    settingsManager.start();
  }
}

export { JobBoardPopup };
