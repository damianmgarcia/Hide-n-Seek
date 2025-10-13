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
  const { addHns, getAllHns, removeHns, setDisplayPreference } = jobListings(
    jobBoard.id
  );

  addMessageListener("get status", getStatus);
  chrome.runtime.onMessage.addListener(routeMessage);
  window.addEventListener("pageshow", checkBfcache);

  const userSettings = await chrome.storage.local.get();
  setDisplayPreference(userSettings);

  const listingCollector = new ElementCollector();
  listingCollector.onAdded.addListener((jobListing) => {
    console.log("hns", listingCollector.collection.size);
    addHns(jobListing, attributeBlockers);
    sendStatus("listing added");
  });
  listingCollector.onRemoved.addListener(removeHns);
  listingCollector.onNotEmpty.addListener(() =>
    sendStatus("hasListings changed")
  );
  listingCollector.onEmpty.addListener(() => sendStatus("hasListings changed"));

  const attributeBlockers = jobBoard.attributes.map(
    (attribute) =>
      new AttributeBlocker(jobBoard, attribute, userSettings, getAllHns)
  );

  listingCollector.collect(jobBoard.listingSelector);
})();
