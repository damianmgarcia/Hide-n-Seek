const hnsStatus = (jobBoard) => {
  const blockedJobsCount = () =>
    document.querySelectorAll(
      `.hns-container:has([data-hns-blocked-attribute="true"])`
    ).length;

  const sendStatus = ({ sendResponse }) =>
    sendResponse({
      jobBoard,
      hasHideNSeekUI: Boolean(document.querySelector(".hns-container")),
      blockedJobsCount: blockedJobsCount(),
    });

  const checkPage = (pageTransitionEvent) => {
    if (pageTransitionEvent.persisted) notifyRuntime("bfcache used");
  };

  const notifyRuntime = (message) =>
    chrome.runtime.sendMessage({
      body: message,
      jobBoard,
      hasHideNSeekUI: Boolean(document.querySelector(".hns-container")),
      blockedJobsCount: blockedJobsCount(),
    });

  return { checkPage, notifyRuntime, sendStatus };
};
