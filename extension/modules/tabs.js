import { getJobBoardIds, getJobBoardTabs } from "./job-boards.js";

const getContentScriptStatus = async (tab) => {
  try {
    return await chrome.tabs.sendMessage(tab.id, {
      from: "background script",
      to: ["content script"],
      body: "send status",
    });
  } catch {
    return {
      blockedJobsCount: 0,
      hasContentScript: false,
      hasHideNSeekUI: false,
      jobBoardId: "",
    };
  }
};

const updateBadge = async (tab) => {
  const contentScriptStatus = await getContentScriptStatus(tab);
  const title =
    "Hide n' Seek" +
    (contentScriptStatus.hasHideNSeekUI
      ? `\n\n${contentScriptStatus.blockedJobsCount} job${
          contentScriptStatus.blockedJobsCount === 1 ? "" : "s"
        } blocked on this page\n`
      : "");
  chrome.action.setTitle({
    tabId: tab.id,
    title: title,
  });
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: contentScriptStatus.hasHideNSeekUI
      ? contentScriptStatus.blockedJobsCount.toString()
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

export { updateBadge, updateBadges };
