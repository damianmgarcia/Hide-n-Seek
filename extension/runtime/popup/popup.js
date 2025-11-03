import { addMessageListener } from "../modules/messaging.js";
import { refreshPopup } from "../modules/refresh-popup.js";
import { getActiveTab, getContentStatus } from "../modules/tabs.js";
import "../modules/sync-manager.js";
import { JobSearchPopup } from "./classes/job-search-popup.js";
import { JobBoardPopup } from "./classes/job-board-popup.js";

(async () => {
  addMessageListener("bfcache used", refreshPopup);
  addMessageListener("hasListings changed", refreshPopup);

  const activeTab = await getActiveTab();
  if (!activeTab) return JobSearchPopup.start(activeTab);
  const { hasListings, jobBoard } = await getContentStatus(activeTab);
  if (!hasListings) return JobSearchPopup.start(activeTab);
  JobBoardPopup.start(jobBoard);
})();
