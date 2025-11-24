import { addMessageListener } from "../modules/messaging.js";
import { refreshPopup } from "../modules/refresh-popup.js";
import {
  hasOriginPermissions,
  requestOriginPermissions,
} from "../modules/permissions.js";
import { getActiveTab, getTabStatus } from "../modules/tabs.js";
import { getJobBoardByHostname } from "../modules/job-boards.js";
import "../modules/sync-manager.js";
import "../modules/settings-manager.js";
import { JobSearchPopup } from "./classes/job-search-popup.js";
import { JobBoardPopup } from "./classes/job-board-popup.js";

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
    permissionsButton.textContent = `Enable Hide n' Seek on ${jobBoard.name}`;
    permissionsButton.addEventListener("click", () =>
      requestOriginPermissions(jobBoard.origins)
    );
  }
})();
