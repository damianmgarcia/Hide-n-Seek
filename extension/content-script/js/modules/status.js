const hnsStatus = (() => {
  const { id } = jobBoard;

  const sendStatus = ({ sendResponse }) =>
    sendResponse({
      hasContentScript: true,
      hasHideNSeekUI: Boolean(document.querySelector(".hns-element")),
      jobBoardId: id,
      blockedJobsCount: document.querySelectorAll(
        `.hns-element:has([data-hns-blocked-attribute="true"])`
      ).length,
    });

  return { sendStatus };
})();
