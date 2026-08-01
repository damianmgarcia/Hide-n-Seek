const jobListings = async (jobBoard) => {
  const hnsMap = new Map();

  const addHns = (jobListing) => {
    jobListing.setAttribute("data-hns-job-listing", "");
    const hns = ui.createComponent(
      "hns-container",
      jobBoard.id,
      attributeBlockers,
    );
    hns.jobListing = jobListing;
    hnsMap.set(jobListing, hns);
    for (const attributeBlocker of attributeBlockers)
      attributeBlocker.addToggles(hns);
    jobListing.append(hns.element);
  };

  const removeHns = (jobListing) => {
    hnsMap.delete(jobListing);
  };

  const storage = await chrome.storage.local.get();
  const updateDisplay = (attribute, value) => {
    document.documentElement.setAttribute(attribute, value);
  };
  const displaySettings = [
    {
      storageKey: "removeHiddenJobs",
      attribute: "data-hns-remove-hidden-jobs",
      defaultValue: false,
    },
    {
      storageKey: "removeBlockButtons",
      attribute: "data-hns-remove-block-buttons",
      defaultValue: false,
    },
  ];
  for (const { storageKey, attribute, defaultValue } of displaySettings) {
    updateDisplay(attribute, storage[storageKey] || defaultValue);
    chrome.storage.local.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, storageKey))
        updateDisplay(attribute, changes[storageKey].newValue || defaultValue);
    });
  }
  const displaySettingByAttribute = Object.fromEntries(
    displaySettings.map((displaySetting) => [
      displaySetting.attribute,
      displaySetting,
    ]),
  );
  const displaySettingsObserver = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.target.getAttribute(mutation.attributeName) !== null) return;
      const displaySetting = displaySettingByAttribute[mutation.attributeName];
      const localStorage = await chrome.storage.local.get();
      mutation.target.setAttribute(
        displaySetting.attribute,
        localStorage[displaySetting.storageKey] || displaySetting.defaultValue,
      );
    }
  });
  displaySettingsObserver.observe(document.documentElement, {
    attributeFilter: displaySettings.map(
      (displaySetting) => displaySetting.attribute,
    ),
  });

  const attributeBlockers = jobBoard.attributes.map(
    (attribute) => new AttributeBlocker(jobBoard, attribute, storage, hnsMap),
  );

  const attributeBlockerMap = new Map(
    attributeBlockers.map((attributeBlocker) => [
      attributeBlocker.storageKey,
      attributeBlocker,
    ]),
  );

  chrome.storage.local.onChanged.addListener((changes) =>
    Object.entries(changes).forEach(([storageKey, changes]) =>
      attributeBlockerMap.get(storageKey)?.handleStorageChanges(changes),
    ),
  );

  return { addHns, removeHns };
};
