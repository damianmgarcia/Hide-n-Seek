(async () => {
  const jobBoard = await chrome.runtime.sendMessage({
    from: "content script",
    to: ["background script"],
    body: "send job board",
    data: location.hostname,
  });

  if (!jobBoard) return;

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
  listingCollector.onAdded.addListener()
})();
