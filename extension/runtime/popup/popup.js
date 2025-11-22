import { addMessageListener } from "../modules/messaging.js";
import { refreshPopup } from "../modules/refresh-popup.js";
import { hasOriginPermissions } from "../modules/permissions.js";
import { getActiveTab, getTabStatus } from "../modules/tabs.js";
import "../modules/sync-manager.js";
import { JobSearchPopup } from "./classes/job-search-popup.js";
import { JobBoardPopup } from "./classes/job-board-popup.js";
import { getJobBoardByHostname } from "../modules/job-boards.js";

(async () => {
  addMessageListener("refresh popup", refreshPopup);

  const activeTab = await getActiveTab();
  if (!activeTab) return JobSearchPopup.start(activeTab);
  const jobBoard = getJobBoardByHostname(new URL(activeTab.url).hostname);
  if (!jobBoard) return JobSearchPopup.start(activeTab);
  const originPermissions = await hasOriginPermissions(jobBoard.origins);
  if (originPermissions === true) {
    const { hasListings } = await getTabStatus(activeTab);
    if (!hasListings) {
      JobSearchPopup.start(activeTab);
    } else {
      JobBoardPopup.start(jobBoard);
    }
  } else if (originPermissions === false) {
    const permissionsButton = document.querySelector("#request-permissions");
    permissionsButton.setAttribute("data-permissions-needed", "");
    permissionsButton.textContent = `Enable Hide n' Seek for ${jobBoard.name}`;
    permissionsButton.addEventListener("click", () =>
      chrome.runtime.sendMessage({
        request: "request origin permissions",
        data: { origins: jobBoard.origins },
      })
    );
  }
})();
