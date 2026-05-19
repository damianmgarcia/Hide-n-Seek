import { HiddenJobsListManager } from "./hidden-jobs-list.js";
import { UnblockAllJobsManager } from "./unblock-all-jobs.js";

class JobBoardPopup {
  static started = false;
  static async start(jobBoard) {
    document.documentElement.setAttribute("data-job-board-id", jobBoard.id);

    if (this.started) return;
    this.started = true;
    new UnblockAllJobsManager(jobBoard);
    new HiddenJobsListManager(jobBoard);
  }
}

export { JobBoardPopup };
