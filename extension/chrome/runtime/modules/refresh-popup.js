import { getActiveTab } from "./tabs.js";
import { JobBoardPopup } from "../popup/classes/job-board-popup.js";
import { JobSearchPopup } from "../popup/classes/job-search-popup.js";

const refreshPopup = async ({ message, sender }) => {
  const activeTab = await getActiveTab();

  if (!sender.tab) sender.tab = activeTab;

  const senderIsActiveTab =
    sender.tab.id === activeTab.id &&
    sender.tab.windowId === activeTab.windowId;

  if (!senderIsActiveTab) return;

  if (!message || !message.data) {
    location.reload();
  } else if (message.data.hasListings === false) {
    JobSearchPopup.start(activeTab);
  } else if (message.data.hasListings === true) {
    JobBoardPopup.start(message.data.jobBoard);
  }
};

export { refreshPopup };
