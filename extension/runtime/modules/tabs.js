import {
  jobBoardIds,
  getJobBoardTabs,
  getJobBoardByHostname,
} from "./job-boards.js";
import { hasOriginPermissions } from "./permissions.js";

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

const updateBadge = async (tab, { text, color } = {}) => {
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
    text:
      text ||
      (tabStatus.hasListings ? tabStatus.blockedJobsCount.toString() : ""),
  });
  chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color: color || [255, 0, 0, 255],
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

const reloadTabs = async (tabs) =>
  Promise.all(
    tabs.map((tab) =>
      chrome.tabs.reload(tab.id, {
        bypassCache: true,
      })
    )
  );

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.url) return;
  const jobBoard = getJobBoardByHostname(new URL(tab.url).hostname);
  if (!jobBoard) return;
  const originPermissions = await hasOriginPermissions(jobBoard.origins);
  if (!originPermissions) {
    updateBadge(tab, { text: "!", color: [255, 255, 0, 255] });
  }
});

export { getActiveTab, getTabStatus, updateBadge, updateBadges, reloadTabs };
