import { addResponse, respond } from "../modules/messaging.js";
import { refreshPopup } from "./modules/refresh-popup.js";
import { isFirefox } from "../modules/browser.js";
import { getActiveTab, getContentStatus } from "../modules/tabs.js";
import { syncManager } from "./modules/sync-manager.js";
import { JobSearchPopup } from "./classes/job-search-popup.js";
import { JobBoardPopup } from "./classes/job-board-popup.js";

(async () => {
  addResponse("bfcache used", refreshPopup);
  addResponse("hasHideNSeekUI changed", refreshPopup);

  chrome.runtime.onMessage.addListener(respond);

  syncManager.start();
  const activeTab = await getActiveTab();
  if (!activeTab) return JobSearchPopup.start(activeTab);
  const { hasHideNSeekUI, jobBoard } = await getContentStatus(activeTab);
  if (!hasHideNSeekUI) return JobSearchPopup.start(activeTab);
  JobBoardPopup.start(jobBoard);
})();
