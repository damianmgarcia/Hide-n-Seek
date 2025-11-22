import { jobBoardIds, getJobBoardTabs } from "./job-boards.js";

const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return activeTab;
};

const getTabStatus = async (tab) => {
  try {
    return await chrome.tabs.sendMessage(tab.id, {
      request: "get tab status",
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
  const tabStatus = await getTabStatus(tab);
  const title =
    "Hide n' Seek" +
    (tabStatus.hasListings
      ? `\n\n${tabStatus.blockedJobsCount} job${
          tabStatus.blockedJobsCount === 1 ? "" : "s"
        } blocked on this page\n`
      : "");
  chrome.action.setTitle({
    tabId: tab.id,
    title: title,
  });
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: tabStatus.hasListings ? tabStatus.blockedJobsCount.toString() : "",
  });
  chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color: [255, 128, 128, 255],
  });
};

const updateBadges = (changes) =>
  jobBoardIds
    .filter((jobBoardId) =>
      Object.keys(changes).some(
        (key) =>
          key.includes(jobBoardId) &&
          key.includes("blockedJobAttributeValues") &&
          !key.endsWith(".backup")
      )
    )
    .map((jobBoardId) => getJobBoardTabs({ jobBoardId }))
    .forEach(async (tabs) => (await tabs).forEach(updateBadge));

export { getActiveTab, getTabStatus, updateBadge, updateBadges };
