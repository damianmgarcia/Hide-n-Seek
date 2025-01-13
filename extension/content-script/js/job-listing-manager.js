class JobListingManager {
  #jobListingObserver = new MutationObserver(() => this.processJobListings());
  #hnsElementMap = new WeakMap();

  constructor(jobBoardId, listingSelector, jobAttributeManagers, storage) {
    this.jobBoardId = jobBoardId;
    this.listingSelector = listingSelector;
    this.attributeManagers = jobAttributeManagers;
    this.removeHiddenJobsStorageKey = `JobDisplayManager.${jobBoardId}.removeHiddenJobs`;

    document.documentElement.setAttribute(
      "data-hns-remove-hidden-jobs",
      storage[this.removeHiddenJobsStorageKey] || false
    );
  }

  start() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message.to.includes("content script")) return;

      if (message.body === "send status")
        sendResponse({
          hasContentScript: true,
          hasHideNSeekUI: this.hasHideNSeekUI,
          jobBoardId: this.jobBoardId,
          blockedJobsCount: document.querySelectorAll(
            `.hns-element:has([data-hns-blocked-attribute="true"])`
          ).length,
        });
    });

    chrome.storage.local.onChanged.addListener((changes) => {
      const containsChangesToRemoveHiddenJobs = Object.hasOwn(
        changes,
        this.removeHiddenJobsStorageKey
      );

      if (!containsChangesToRemoveHiddenJobs) return;

      document.documentElement.setAttribute(
        "data-hns-remove-hidden-jobs",
        changes[this.removeHiddenJobsStorageKey].newValue
      );
    });

    this.processJobListings();

    addEventListener("pageshow", (pageTransitionEvent) => {
      if (!pageTransitionEvent.persisted) return;

      chrome.runtime.sendMessage({
        from: "content script",
        to: ["background script", "popup script"],
        body: "bfcache used",
        jobBoardId: this.jobBoardId,
        hasHideNSeekUI: this.hasHideNSeekUI,
      });
    });

    this.#jobListingObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });

    return this;
  }

  processJobListings() {
    document
      .querySelectorAll(this.listingSelector)
      .forEach((jobListing) => this.processJobListing(jobListing));

    chrome.runtime.sendMessage({
      from: "content script",
      to: ["background script"],
      body: "new listings",
      jobBoardId: this.jobBoardId,
      hasHideNSeekUI: this.hasHideNSeekUI,
    });

    const hasHideNSeekUI = Boolean(document.querySelector(".hns-element"));
    const hideNSeekUIChanged = hasHideNSeekUI !== this.hasHideNSeekUI;
    if (hideNSeekUIChanged) this.notifyScripts(hasHideNSeekUI);
  }

  processJobListing(jobListing) {
    const existingHnsElement = this.#hnsElementMap.get(jobListing);
    if (existingHnsElement?.isConnected) return;

    const newHnsElement = ui.createElement("hns-element", this.jobBoardId);
    this.#hnsElementMap.set(jobListing, newHnsElement);

    this.attributeManagers.forEach((attributeManager) =>
      attributeManager.processHnsElement(newHnsElement, jobListing)
    );

    jobListing.setAttribute("data-hns-job-listing", "");
    jobListing.append(newHnsElement);
  }

  notifyScripts(hasHideNSeekUI) {
    chrome.runtime.sendMessage({
      from: "content script",
      to: ["background script", "popup script"],
      body: "hasHideNSeekUI changed",
      jobBoardId: this.jobBoardId,
      hasHideNSeekUI,
    });

    this.hasHideNSeekUI = hasHideNSeekUI;
  }
}
