const jobListings = (jobBoardId) => {
  const hnsMap = new Map();

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

  const addHns = (jobListing, attributeBlockers) => {
    jobListing.setAttribute("data-hns-job-listing", "");
    const hnsContainerComponent = ui.createComponent(
      "hns-container",
      jobBoardId
    );

    attributeBlockers
      .map((attributeBlocker) => attributeBlocker.getToggle(jobListing))
      .filter((toggle) => toggle)
      .map((toggle) => hnsContainerComponent.addToggle(toggle));

    hnsMap.set(jobListing, {
      hnsContainer: hnsContainerComponent.element,
      addToggle: hnsContainerComponent.addToggle,
      removeToggle: hnsContainerComponent.removeToggle,
    });
    jobListing.append(hnsContainerComponent.element);
  };

  const removeHns = (jobListing) => {
    return hnsMap.delete(jobListing);
  };

  const getAllHns = () => hnsMap.entries();

  return { addHns, getAllHns, removeHns, setDisplayPreference };
};
