const hnsStatus = (jobBoard) => {
  const tabStatus = () => ({
    jobBoard,
    hasListings: Boolean(
      document.querySelector(".hns-container:has(.hns-block-attribute-toggle)"),
    ),
    blockedJobsCount: document.querySelectorAll(
      ".hns-container:has([data-hns-blocked-attribute])",
    ).length,
  });

  const getTabStatus = ({ sendResponse }) => sendResponse(tabStatus());

  const sendTabStatus = () =>
    chrome.runtime.sendMessage({
      request: "refresh popup",
      data: tabStatus(),
    });

  const checkBfcache = (pageTransitionEvent) => {
    if (pageTransitionEvent.persisted) sendTabStatus();
  };

  return { checkBfcache, getTabStatus, sendTabStatus };
};
