const hnsStatus = (jobBoard) => {
  const tabStatus = () => ({
    jobBoard,
    hasListings: Boolean(document.querySelector(".hns-container")),
    blockedJobsCount: document.querySelectorAll(
      `.hns-container:has([data-hns-blocked-attribute])`
    ).length,
  });

  const getTabStatus = ({ sendResponse }) => {
    sendResponse(tabStatus());
    const isLinkedInJobCollectionIframe =
      jobBoard.id === "linkedIn" &&
      location.pathname.startsWith("/jobs/collections") &&
      document.querySelector("[data-testid='interop-iframe']");
    if (isLinkedInJobCollectionIframe) location.reload();
  };

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
