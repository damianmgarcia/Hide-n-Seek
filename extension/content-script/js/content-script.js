(async () => {
  const { addResponse, respond } = messaging;
  const { sendStatus } = hnsStatus;
  const { collectListings } = listings;

  const jobBoard = await chrome.runtime.sendMessage({
    from: "content script",
    to: ["background script"],
    body: "send job board",
    data: location.hostname,
  });

  if (!jobBoard) return;

  addResponse("send status", sendStatus);
  chrome.runtime.onMessage.addListener(respond);
  const localStorage = await chrome.storage.local.get();

  const jobAttributeManagers = jobBoard.attributes.map((attribute) =>
    new JobAttributeManager(jobBoard, attribute, localStorage).start()
  );

  new JobListingManager(
    jobBoard.id,
    jobBoard.listingSelector,
    jobAttributeManagers,
    localStorage
  ).start();

  const listingCollector = new ElementCollector();
  listingCollector.onAdded.addListener(addListing);
  listingCollector.onRemoved.addListener((listing) => {
    console.log("removed listing: ", listing); // TBD
  });
  listingCollector.collect(jobBoard.listingSelector);
})();

// events.listingAdded.addListener((listing) => {
//   const overlay = ui.getOverlay();

//   listing.append(overlay);
//   hnss.add(hns);
// });

// events.listingRemoved.addListener((listing) => {
//   hnss.delete(listing);
// });

// // Collect listings
// const listingCollection = listingCollector.collect(jobBoard.listingSelector);
