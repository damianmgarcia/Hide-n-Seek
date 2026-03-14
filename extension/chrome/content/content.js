(async () => {
  const jobBoard = await chrome.runtime.sendMessage({
    request: "get job board",
    data: {
      hostname: location.hostname,
    },
  });

  if (!jobBoard) return;

  const { addMessageListener } = messaging;
  const { checkBfcache, getTabStatus, sendTabStatus } = hnsStatus(jobBoard);
  const { addHns, removeHns } = await jobListings(jobBoard);

  addMessageListener("get tab status", getTabStatus);
  window.addEventListener("pageshow", checkBfcache);

  const listingCollector = new ElementCollector();
  listingCollector.onAdded.addListener((jobListing) => {
    addHns(jobListing);
    sendTabStatus();
  });
  listingCollector.onRemoved.addListener(removeHns);
  listingCollector.onNotEmpty.addListener(sendTabStatus);
  listingCollector.onEmpty.addListener(sendTabStatus);
  listingCollector.collect(jobBoard.listingSelector);
})();
