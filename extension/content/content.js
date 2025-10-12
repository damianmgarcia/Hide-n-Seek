(async () => {
  const jobBoard = await chrome.runtime.sendMessage({
    request: "get job board",
    data: {
      hostname: location.hostname,
    },
  });

  if (!jobBoard) return;

  const { addMessageListener, routeMessage } = messaging;
  const { getStatus, checkBfcache, sendStatus } = hnsStatus(jobBoard);
  const { addHnsToListing, setDisplayPreference } = jobListings(jobBoard.id);

  addMessageListener("get status", getStatus);
  chrome.runtime.onMessage.addListener(routeMessage);
  window.addEventListener("pageshow", checkBfcache);

  const userSettings = await chrome.storage.local.get();
  setDisplayPreference(userSettings);
  const attributeBlockers = jobBoard.attributes.map(
    (attribute) => new AttributeBlocker(jobBoard, attribute, userSettings)
  );

  const listingCollector = new ElementCollector();
  listingCollector.onAdded.addListener((jobListing) => {
    console.log("hns", listingCollector.collection.size);
    addHnsToListing(jobListing, attributeBlockers);
    sendStatus("listing added");
  });
  listingCollector.onNotEmpty.addListener(() =>
    sendStatus("hasListings changed")
  );
  listingCollector.onEmpty.addListener(() => sendStatus("hasListings changed"));

  listingCollector.collect(jobBoard.listingSelector);
})();
