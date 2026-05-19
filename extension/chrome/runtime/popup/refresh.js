import { getActiveTab } from "../modules/tabs.js";
import { JobBoardPopup } from "./job-board/job-board.js";
import { JobSearchPopup } from "./job-search/job-search.js";

const refresh = async ({ message, sender }) => {
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

export { refresh };
