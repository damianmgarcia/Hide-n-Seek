import { addMessageListener } from "../modules/messaging.js";
import { refresh } from "./refresh.js";
import {
  hasOriginPermissions,
  requestOriginPermissions,
} from "../modules/permissions.js";
import { getActiveTab, getTabStatus } from "../modules/tabs.js";
import { getJobBoardByUrl } from "../modules/job-boards.js";
import "./settings/settings.js";
import { JobSearchPopup } from "./job-search/job-search.js";
import { JobBoardPopup } from "./job-board/job-board.js";

(async () => {
  addMessageListener("refresh popup", refresh);

  const activeTab = await getActiveTab();
  if (!activeTab) return JobSearchPopup.start(activeTab);
  const jobBoard = getJobBoardByUrl(activeTab.url);
  if (!jobBoard) return JobSearchPopup.start(activeTab);
  const originPermissions = await hasOriginPermissions(
    jobBoard.matchPatterns.origins,
  );
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
      requestOriginPermissions(jobBoard.matchPatterns.origins),
    );
  }
})();
