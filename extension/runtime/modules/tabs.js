import { getJobBoardIds, getJobBoardTabs } from "./job-boards.js";

const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return activeTab;
};

const getContentStatus = async (tab) => {
  try {
    return await chrome.tabs.sendMessage(tab.id, {
      request: "get status",
    });
  } catch {
    return {
      blockedJobsCount: 0,
      hasListings: false,
      jobBoard: false,
    };
  }
};

const updateBadge = async (tab) => {
  const contentStatus = await getContentStatus(tab);
  const title =
    "Hide n' Seek" +
    (contentStatus.hasListings
      ? `\n\n${contentStatus.blockedJobsCount} job${
          contentStatus.blockedJobsCount === 1 ? "" : "s"
        } blocked on this page\n`
      : "");
  chrome.action.setTitle({
    tabId: tab.id,
    title: title,
  });
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: contentStatus.hasListings
      ? contentStatus.blockedJobsCount.toString()
      : "",
  });
  chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color: [255, 128, 128, 255],
  });
};

const updateBadges = (changes) =>
  getJobBoardIds()
    .filter((jobBoardId) =>
      Object.keys(changes).some(
        (key) =>
          key.includes(jobBoardId) &&
          key.includes("blockedJobAttributeValues") &&
          !key.endsWith(".backup")
      )
    )
    .map(getJobBoardTabs)
    .forEach(async (tabs) => (await tabs).forEach(updateBadge));

export { getActiveTab, getContentStatus, updateBadge, updateBadges };
