const jobListings = (jobBoardId) => {
  const setDisplayPreference = (userSettings) => {
    const updateDOM = (displayPreference) => {
      document.documentElement.setAttribute(
        "data-hns-remove-hidden-jobs",
        displayPreference
      );
    };

    const removeHiddenJobsStorageKey = `JobDisplayManager.${jobBoardId}.removeHiddenJobs`;

    updateDOM(userSettings[removeHiddenJobsStorageKey] || false);

    chrome.storage.local.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, removeHiddenJobsStorageKey))
        updateDOM(changes[removeHiddenJobsStorageKey].newValue);
    });
  };

  const addHnsToListing = (jobListing, attributeBlockers) => {
    jobListing.setAttribute("data-hns-job-listing", "");
    const toggles = attributeBlockers
      .map((attributeBlocker) => attributeBlocker.getToggle(jobListing))
      .filter((toggle) => toggle);
    const hnsContainer = ui.createElement("hns-container", jobBoardId, toggles);
    jobListing.append(hnsContainer);
  };

  return { addHnsToListing, setDisplayPreference };
};
