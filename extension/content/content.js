(async () => {
  const jobBoard = await chrome.runtime.sendMessage({
    request: "get job board",
    data: {
      hostname: location.hostname,
    },
  });

  if (!jobBoard) return;

  const { addMessageListener, routeMessage } = messaging;
  const { checkBfcache, getStatus, sendStatus } = hnsStatus(jobBoard);
  const { addHns, removeHns } = await jobListings(jobBoard);

  addMessageListener("get status", getStatus);
  chrome.runtime.onMessage.addListener(routeMessage);
  window.addEventListener("pageshow", checkBfcache);

  const listingCollector = new ElementCollector();
  window.listingCollector = listingCollector;
  listingCollector.onAdded.addListener((jobListing) => {
    addHns(jobListing);
    sendStatus("listing added");
  });
  listingCollector.onRemoved.addListener(removeHns);
  listingCollector.onNotEmpty.addListener(() =>
    sendStatus("hasListings changed")
  );
  listingCollector.onEmpty.addListener(() => sendStatus("hasListings changed"));
  listingCollector.collect(jobBoard.listingSelector);
})();
