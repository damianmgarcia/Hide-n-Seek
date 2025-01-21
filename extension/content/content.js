(async () => {
  const jobBoard = await chrome.runtime.sendMessage({
    body: "send job board",
    hostname: location.hostname,
  });

  if (!jobBoard) return;

  const { addResponse, respond } = messaging;
  const { sendStatus, checkPage, notifyRuntime } = hnsStatus(jobBoard);
  const { addHnsToListing, setDisplayPreference } = jobListings(jobBoard.id);

  addResponse("send status", sendStatus);
  chrome.runtime.onMessage.addListener(respond);
  window.addEventListener("pageshow", checkPage);

  const userSettings = await chrome.storage.local.get();
  setDisplayPreference(userSettings);
  const attributeBlockers = jobBoard.attributes.map(
    (attribute) => new AttributeBlocker(jobBoard, attribute, userSettings)
  );

  const listingCollector = new ElementCollector();
  listingCollector.onAdded.addListener((jobListing) => {
    addHnsToListing(jobListing, attributeBlockers);
    notifyRuntime("new listing");
  });
  listingCollector.onFilled.addListener(() =>
    notifyRuntime("hasHideNSeekUI changed")
  );
  listingCollector.onEmptied.addListener(() =>
    notifyRuntime("hasHideNSeekUI changed")
  );

  listingCollector.collect(jobBoard.listingSelector);
})();
