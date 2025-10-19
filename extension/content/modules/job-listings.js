const jobListings = async (jobBoard) => {
  const hnsMap = new Map();

  const setDisplayPreference = (userSettings) => {
    const updateDOM = (displayPreference) => {
      document.documentElement.setAttribute(
        "data-hns-remove-hidden-jobs",
        displayPreference
      );
    };

    const removeHiddenJobsStorageKey = `JobDisplayManager.${jobBoard.id}.removeHiddenJobs`;
    updateDOM(userSettings[removeHiddenJobsStorageKey] || false);

    chrome.storage.local.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, removeHiddenJobsStorageKey))
        updateDOM(changes[removeHiddenJobsStorageKey].newValue);
    });
  };

  const addHns = (jobListing) => {
    jobListing.setAttribute("data-hns-job-listing", "");
    const hns = ui.createComponent("hns-container", jobBoard.id);
    hns.jobListing = jobListing; // TBD
    hns.attributeBlockers = attributeBlockers; // TBD
    hnsMap.set(jobListing, hns);
    for (const attributeBlocker of attributeBlockers)
      attributeBlocker.addToggles(hns);
    jobListing.append(hns.element);
  };

  const removeHns = (jobListing) => {
    hnsMap.delete(jobListing);
  };

  const storage = await chrome.storage.local.get();
  setDisplayPreference(storage);

  const attributeBlockers = jobBoard.attributes.map(
    (attribute) => new AttributeBlocker(jobBoard, attribute, storage, hnsMap)
  );

  const attributeBlockerMap = new Map(
    attributeBlockers.map((attributeBlocker) => [
      attributeBlocker.storageKey,
      attributeBlocker,
    ])
  );

  chrome.storage.local.onChanged.addListener((changes) =>
    Object.entries(changes).forEach(([storageKey, changes]) =>
      attributeBlockerMap.get(storageKey)?.handleStorageChanges(changes)
    )
  );

  return { addHns, removeHns, setDisplayPreference };
};
