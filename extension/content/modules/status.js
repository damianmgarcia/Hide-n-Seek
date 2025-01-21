const hnsStatus = (jobBoard) => {
  const getStatus = () => ({
    jobBoard,
    hasHideNSeekUI: Boolean(document.querySelector(".hns-container")),
    blockedJobsCount: document.querySelectorAll(
      `.hns-container:has([data-hns-blocked-attribute])`
    ).length,
  });

  const sendStatus = ({ sendResponse }) => sendResponse(getStatus());

  const checkPage = (pageTransitionEvent) => {
    if (pageTransitionEvent.persisted) notifyRuntime("bfcache used");
  };

  const notifyRuntime = (message) =>
    chrome.runtime.sendMessage({
      body: message,
      ...getStatus(),
    });

  return { checkPage, notifyRuntime, sendStatus };
};
