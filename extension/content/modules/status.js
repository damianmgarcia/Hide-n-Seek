const hnsStatus = (jobBoard) => {
  const status = () => ({
    jobBoard,
    hasListings: Boolean(document.querySelector(".hns-container")),
    blockedJobsCount: document.querySelectorAll(
      `.hns-container:has([data-hns-blocked-attribute])`
    ).length,
  });

  const getStatus = ({ sendResponse }) => sendResponse(status());

  const sendStatus = (message) =>
    chrome.runtime.sendMessage({
      request: message,
      data: status(),
    });

  const checkBfcache = (pageTransitionEvent) => {
    if (pageTransitionEvent.persisted) sendStatus("bfcache used");
  };

  return { checkBfcache, getStatus, sendStatus };
};
