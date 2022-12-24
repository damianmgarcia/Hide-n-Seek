const supportedJobBoardUrls = [
  "www.linkedin.com/jobs/search",
  "www.indeed.com/jobs?",
];

const updateChromeActionForTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab) return;

  const activeTabUrlMatchesSupportedJobBoardUrl = supportedJobBoardUrls.some(
    (supportedJobUrl) => activeTab.url?.includes(supportedJobUrl)
  );

  activeTabUrlMatchesSupportedJobBoardUrl
    ? chrome.action.enable()
    : chrome.action.disable();
};

[
  chrome.runtime.onInstalled,
  chrome.runtime.onStartup,
  chrome.tabs.onActivated,
].forEach((eventType) =>
  eventType.addListener(() => updateChromeActionForTab())
);

chrome.tabs.onUpdated.addListener(async (tabId, tabChanges, tab) => {
  if (tabChanges.status !== "loading") return;

  updateChromeActionForTab();

  if (!tab.url) return;

  const tabUrlMatchesSupportedJobBoardUrl = supportedJobBoardUrls.some(
    (supportedJobUrl) => tab.url.includes(supportedJobUrl)
  );

  if (!tabUrlMatchesSupportedJobBoardUrl) return;

  const inject = () => {
    chrome.scripting.insertCSS({
      target: { tabId },
      files: ["/content-script/css/content-script.css"],
    });
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["/content-script/js/content-script.js"],
    });
  };

  try {
    const contentScriptResponse = await chrome.tabs.sendMessage(tabId, {
      message: "ping",
    });

    if (contentScriptResponse.message !== "ping") inject();
  } catch {
    inject();
  }
});
