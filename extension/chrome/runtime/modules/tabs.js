import { jobBoards, getJobBoardTabs, getJobBoardByUrl } from "./job-boards.js";
import { hasOriginPermissions } from "./permissions.js";

const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return activeTab;
};

const defaultTabStatus = {
  blockedJobsCount: 0,
  hasListings: false,
  jobBoard: false,
};

const getTabStatus = async (tab) => {
  try {
    const tabStatus =
      (await chrome.tabs.sendMessage(tab.id, {
        request: "get tab status",
      })) || defaultTabStatus;
    return { ...tabStatus, hasContentScript: true };
  } catch {
    return { ...defaultTabStatus, hasContentScript: false };
  }
};

const updateBadge = async (tab, { title, text, backgroundColor } = {}) => {
  try {
    const tabStatus = await getTabStatus(tab);

    title =
      title ||
      "Hide n' Seek" +
        (tabStatus.hasListings
          ? `\n\n${tabStatus.blockedJobsCount} job${
              tabStatus.blockedJobsCount === 1 ? "" : "s"
            } blocked on this page\n`
          : "");
    text =
      text ||
      (tabStatus.hasListings ? tabStatus.blockedJobsCount.toString() : "");

    backgroundColor = backgroundColor || [220, 0, 0, 255];

    await Promise.all([
      chrome.action.setTitle({
        tabId: tab.id,
        title: title,
      }),
      chrome.action.setBadgeText({
        tabId: tab.id,
        text: text,
      }),
      chrome.action.setBadgeBackgroundColor({
        tabId: tab.id,
        color: backgroundColor,
      }),
    ]);
  } catch {}
};

const updateBadges = (changes) =>
  jobBoards
    .filter((jobBoard) =>
      Object.keys(changes).some(
        (key) =>
          key.includes(jobBoard.id) &&
          key.includes("blocked") &&
          !key.endsWith(".backup"),
      ),
    )
    .map((jobBoard) => getJobBoardTabs({ jobBoardId: jobBoard.id }))
    .forEach(async (tabs) => (await tabs).forEach(updateBadge));

const reloadTabs = async (tabs) => {
  tabs = tabs || (await getJobBoardTabs());
  await Promise.all(
    tabs.map((tab) =>
      chrome.tabs.reload(tab.id, {
        bypassCache: true,
      }),
    ),
  );
  try {
    await chrome.runtime.sendMessage({
      request: "refresh popup",
    });
  } catch {}
};

let tabHistory = {};
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.url) return;
  const jobBoardByUrl = getJobBoardByUrl(tab.url);
  const tabStatus = await getTabStatus(tab);
  if (!jobBoardByUrl) {
    if (changeInfo.url && tabStatus.hasContentScript) {
      reloadTabs([tab]);
    }
    return;
  }
  if (await hasOriginPermissions(jobBoardByUrl.matchPatterns.origins)) {
    if (changeInfo.url && jobBoardByUrl.isSPA) {
      if (!tabHistory[tabId]) {
        tabHistory[tabId] = changeInfo.url;
        return;
      }
      if (!URL.canParse(tabHistory[tabId]) || !URL.canParse(changeInfo.url)) {
        tabHistory[tabId] = changeInfo.url;
        reloadTabs([tab]);
        return;
      }
      const oldUrl = new URL(tabHistory[tabId]);
      const newUrl = new URL(changeInfo.url);
      const pathChanged =
        oldUrl.origin !== newUrl.origin || oldUrl.pathname !== newUrl.pathname;
      tabHistory[tabId] = changeInfo.url;
      if (pathChanged) reloadTabs([tab]);
      return;
    }
    if (!tabStatus.hasListings) {
      updateBadge(tab, { title: "", text: "" });
    }
  } else {
    updateBadge(tab, {
      title: `Hide n' Seek needs to be enabled on ${jobBoardByUrl.name}`,
      text: "!",
      backgroundColor: [255, 255, 0, 255],
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabHistory[tabId];
});

export { getActiveTab, getTabStatus, updateBadge, updateBadges, reloadTabs };
