import { getActiveTab } from "../../modules/tabs.js";
import { JobBoardPopup } from "../classes/job-board-popup.js";
import { JobSearchPopup } from "../classes/job-search-popup.js";

const refreshPopup = async ({ message, sender }) => {
  const activeTab = await getActiveTab();

  const senderIsActiveTab =
    sender.tab.id === activeTab.id &&
    sender.tab.windowId === activeTab.windowId;

  if (!senderIsActiveTab) return;

  if (message.data.hasListings === true) {
    JobBoardPopup.start(message.data.jobBoard);
  } else if (message.data.hasListings === false) {
    JobSearchPopup.start(activeTab);
  }
};

export { refreshPopup };
