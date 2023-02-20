(async () => {
  class Utilities {
    static getStorageKeyName(jobBlockComponent, jobBoard, ...otherIdentifiers) {
      return [jobBlockComponent, jobBoard, ...otherIdentifiers].join(".");
    }
  }

  class JobBoards {
    static #jobBoards = [
      {
        hostname: "www.linkedin.com",
        jobBoardId: "linkedIn",
      },
      {
        hostname: "www.indeed.com",
        jobBoardId: "indeed",
      },
    ];

    static getJobBoardIdByHostname(hostname = location.hostname) {
      return this.#jobBoards.find((jobBoard) => jobBoard.hostname === hostname)
        ?.jobBoardId;
    }
  }

  class JobBoardSelectors {
    #selectors;
    constructor(jobBoardId) {
      const reduceStringValues = (object) =>
        [
          ...new Set(
            Object.values(object).filter((value) => typeof value === "string")
          ),
        ].join(", ");

      const selectors = {
        linkedIn: {
          jobElement: {
            jobCollection: ".jobs-search-results-list li .job-card-container",
            jobSearchSignedIn:
              ".jobs-search-results-list li .job-card-container",
            jobSearchSignedOut: ".jobs-search__results-list li .base-card",
          },
          baseElementOfJobElement: {
            jobCollection: "li",
            jobSearchSignedIn: "li",
            jobSearchSignedOut: "li",
          },
          companyName: {
            jobCollection: ".job-card-container__primary-description",
            jobSearchSignedIn: ".job-card-container__company-name",
            jobSearchSignedOut: ".base-search-card__subtitle",
          },
          promotionalStatus: {
            jobCollection: "time",
            jobSearchSignedIn: "time",
            jobSearchSignedOut: "time",
          },
        },
        indeed: {
          jobElement: {
            jobFeed: ".jobsearch-ResultsList li .result",
            jobSearch: ".jobsearch-ResultsList li .result",
          },
          baseElementOfJobElement: {
            jobFeed: "li",
            jobSearch: "li",
          },
          companyName: {
            jobFeed: ".companyName",
            jobSearch: ".companyName",
          },
          promotionalStatus: {
            jobFeed: ".sponsoredJob",
            jobSearch: ".sponsoredJob",
          },
        },
      };

      this.#selectors = Object.fromEntries(
        Object.entries(selectors[jobBoardId]).map(([key, value]) => [
          key,
          reduceStringValues(value),
        ])
      );
    }

    get selectors() {
      return this.#selectors;
    }
  }

  class JobRegistrar {
    #jobBoardId;
    #selectorOfJobElement;
    constructor(jobBoardId, selectorOfJobElement) {
      this.#jobBoardId = jobBoardId;
      this.#selectorOfJobElement = selectorOfJobElement;
    }

    #subscriberCallbacks = [];
    startNewJobSubscription(callback) {
      this.#subscriberCallbacks.push(callback);
    }

    #sendJobToSubscribers(job) {
      this.#subscriberCallbacks.forEach((subscriberCallback) =>
        subscriberCallback(job)
      );
    }

    #hasHideNSeekUI;
    #registerJobs() {
      const jobElements = document.querySelectorAll(this.#selectorOfJobElement);

      jobElements.forEach((jobElement) =>
        this.#sendJobToSubscribers(jobElement)
      );

      const hasHideNSeekUI = !!document.querySelector(".job-block-element");

      const hasHideNSeekUIChanged = hasHideNSeekUI !== this.#hasHideNSeekUI;

      if (!hasHideNSeekUIChanged) return;

      chrome.runtime.sendMessage({
        from: "content script",
        to: ["background script", "popup script"],
        body: "hasHideNSeekUI changed",
        jobBoardId: this.#jobBoardId,
        hasHideNSeekUI: hasHideNSeekUI,
      });

      this.#hasHideNSeekUI = hasHideNSeekUI;
    }

    #jobRegistrar = new MutationObserver(() => this.#registerJobs());
    async startRegisteringJobs() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message.to.includes("content script")) return;

        if (message.body === "send status")
          sendResponse({
            hasContentScript: true,
            hasHideNSeekUI: this.#hasHideNSeekUI,
            jobBoardId: this.#jobBoardId,
          });
      });

      this.#registerJobs();

      this.#jobRegistrar.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });
    }
  }

  class JobDisplayManager {
    #selectorOfJobElementBaseElement;
    #removeHiddenJobs;
    #removeHiddenJobsStorageKey;

    constructor(jobBoardId, selectorOfJobElementBaseElement, storage) {
      this.#selectorOfJobElementBaseElement = selectorOfJobElementBaseElement;

      this.#removeHiddenJobsStorageKey = Utilities.getStorageKeyName(
        this.constructor.name,
        jobBoardId,
        "removeHiddenJobs"
      );

      const storageIncludesRemoveHiddenJobsKey = Object.hasOwn(
        storage,
        this.#removeHiddenJobsStorageKey
      );

      this.#removeHiddenJobs = storageIncludesRemoveHiddenJobsKey
        ? storage[this.#removeHiddenJobsStorageKey]
        : false;
    }

    get removeHiddenJobs() {
      return this.#removeHiddenJobs;
    }

    start() {
      this.#startStorageListener();
      return this;
    }

    #startStorageListener() {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const containsChangesToRemoveHiddenJobs = Object.hasOwn(
          storageChanges,
          this.#removeHiddenJobsStorageKey
        );

        if (!containsChangesToRemoveHiddenJobs) return;

        this.#removeHiddenJobs =
          storageChanges[this.#removeHiddenJobsStorageKey].newValue;

        const hiddenJobsBlockElements = document.querySelectorAll(
          ".job-block-element[data-job-block-blocked-job='true']"
        );

        hiddenJobsBlockElements.forEach((hiddenJobBlockElement) =>
          this.#removeHiddenJobs
            ? this.removeHiddenJob(hiddenJobBlockElement)
            : this.unremoveHiddenJob(hiddenJobBlockElement)
        );
      });
    }

    #getBaseElement(jobBlockElement) {
      return jobBlockElement.closest(this.#selectorOfJobElementBaseElement);
    }

    removeHiddenJob(jobBlockElement) {
      const jobElementBaseElement = this.#getBaseElement(jobBlockElement);
      if (!jobElementBaseElement) return;
      jobElementBaseElement.style.setProperty("display", "none");
    }

    unremoveHiddenJob(jobBlockElement) {
      const jobElementBaseElement = this.#getBaseElement(jobBlockElement);
      if (!jobElementBaseElement) return;
      jobElementBaseElement.style.removeProperty("display");
    }
  }

  class JobBlockElementSupplier {
    #jobElementToJobBlockElementMap = new WeakMap();
    getJobBlockElement(jobElement) {
      if (this.#jobElementToJobBlockElementMap.has(jobElement))
        return this.#jobElementToJobBlockElementMap.get(jobElement);

      const jobBlockElement = document.createElement("div");
      jobBlockElement.classList.add("job-block-element");
      jobBlockElement.style.setProperty("display", "none");

      const jobBlockOverlayBlockedJob = document.createElement("div");
      jobBlockOverlayBlockedJob.classList.add("job-block-blocked-job-overlay");

      const jobBlockOverlayUnblockedJob = document.createElement("div");
      jobBlockOverlayUnblockedJob.classList.add(
        "job-block-unblocked-job-overlay"
      );

      const jobBlockBlockButton = document.createElement("div");
      jobBlockBlockButton.classList.add("job-block-block-button");

      const jobBlockBlockButtonIcon = document.createElement("img");
      jobBlockBlockButtonIcon.classList.add("job-block-block-button-icon");
      jobBlockBlockButtonIcon.setAttribute(
        "src",
        `${chrome.runtime.getURL("images/hide-button-icon.svg")}`
      );
      jobBlockBlockButtonIcon.ondragstart = (dragEvent) =>
        dragEvent.preventDefault();

      jobBlockBlockButton.insertAdjacentElement(
        "afterbegin",
        jobBlockBlockButtonIcon
      );
      jobBlockOverlayUnblockedJob.insertAdjacentElement(
        "afterbegin",
        jobBlockBlockButton
      );

      jobBlockElement.insertAdjacentElement(
        "afterbegin",
        jobBlockOverlayBlockedJob
      );
      jobBlockElement.insertAdjacentElement(
        "afterbegin",
        jobBlockOverlayUnblockedJob
      );

      this.#jobElementToJobBlockElementMap.set(jobElement, jobBlockElement);

      return jobBlockElement;
    }

    getJobBlockToggleButtonElement(toggleButtonText) {
      const jobAttributeToggleButtonElement = document.createElement("div");
      jobAttributeToggleButtonElement.classList.add(
        "job-block-attribute-toggle-button"
      );

      const jobAttributeToggleButtonTextElement = document.createElement("div");
      jobAttributeToggleButtonTextElement.classList.add(
        "job-block-attribute-toggle-button-text"
      );
      jobAttributeToggleButtonTextElement.textContent = toggleButtonText;
      jobAttributeToggleButtonTextElement.setAttribute(
        "title",
        toggleButtonText
      );

      const jobAttributeToggleButtonHiddenIndicator =
        document.createElement("div");
      jobAttributeToggleButtonHiddenIndicator.classList.add(
        "job-block-attribute-toggle-button-hidden-indicator"
      );
      jobAttributeToggleButtonHiddenIndicator.textContent = "Hidden";

      jobAttributeToggleButtonElement.insertAdjacentElement(
        "beforeend",
        jobAttributeToggleButtonTextElement
      );

      jobAttributeToggleButtonElement.insertAdjacentElement(
        "beforeend",
        jobAttributeToggleButtonHiddenIndicator
      );

      return jobAttributeToggleButtonElement;
    }
  }

  class JobBlockElementInserter {
    #insertJobBlockElement;
    constructor(jobBoardId, ancestorSelector) {
      const position = {
        linkedIn: "beforeend",
        indeed: "beforeend",
      };
      const useAncestor = {
        linkedIn: true,
        indeed: true,
      };

      this.#insertJobBlockElement = (jobElement, jobBlockElement) => {
        const insertionReferenceElement =
          useAncestor[jobBoardId] && ancestorSelector
            ? jobElement.closest(ancestorSelector)
            : jobElement;
        if (!insertionReferenceElement) return false;
        insertionReferenceElement.style.setProperty("position", "relative");
        insertionReferenceElement.insertAdjacentElement(
          position[jobBoardId],
          jobBlockElement
        );
        return true;
      };
    }
    get insertJobBlockElement() {
      return this.#insertJobBlockElement;
    }
  }

  class JobAttributeValueGetter {
    #getJobAttributeValue;
    constructor(
      jobBoardId,
      jobAttribute,
      selectorOfJobAttributeValue,
      selectorOfJobElementBaseElement
    ) {
      const jobAttributeValue = {
        companyName: {
          dataElementFound: {
            default: (jobAttributeValue) =>
              jobAttributeValue?.textContent.replaceAll("\n", "").trim() ||
              "Unknown Company",
          },
          dataElementNotFound: {
            default: () => "Unknown Company",
          },
        },
        promotionalStatus: {
          dataElementFound: {
            default: () => "",
            indeed: () => "Sponsored",
          },
          dataElementNotFound: {
            default: () => "",
            linkedIn: () => "Promoted",
          },
        },
      };

      const dataElementFound =
        jobAttributeValue[jobAttribute].dataElementFound[jobBoardId] ||
        jobAttributeValue[jobAttribute].dataElementFound.default;

      const dataElementNotFound =
        jobAttributeValue[jobAttribute].dataElementNotFound[jobBoardId] ||
        jobAttributeValue[jobAttribute].dataElementNotFound.default;

      const jobAttributeValueGetter = (jobElement) => {
        const dataElement = jobElement
          .closest(selectorOfJobElementBaseElement)
          .querySelector(selectorOfJobAttributeValue);

        return dataElement
          ? dataElementFound(dataElement)
          : dataElementNotFound(dataElement);
      };

      this.#getJobAttributeValue = jobAttributeValueGetter;
    }
    get getJobAttributeValue() {
      return this.#getJobAttributeValue;
    }
  }

  class JobAttributeManager {
    static #jobAttributes = {
      linkedIn: ["companyName", "promotionalStatus"],
      indeed: ["companyName", "promotionalStatus"],
    };
    static getJobAttributes(jobBoardId) {
      return this.#jobAttributes[jobBoardId];
    }

    static #blockedJobAttributeValueStorageKeys = new Set();
    static addBlockedJobAttributeValueStorageKey(
      blockedJobAttributeValueStorageKey
    ) {
      this.#blockedJobAttributeValueStorageKeys.add(
        blockedJobAttributeValueStorageKey
      );
    }
    static getBlockedJobAttributeValueStorageKeys() {
      return [...this.#blockedJobAttributeValueStorageKeys];
    }

    #jobAttribute;
    #jobBoardId;
    #jobRegistrar;
    #jobBlockElementSupplier;
    #jobBlockElementInserter;
    #jobAttributeValueGetter;
    #jobDisplayManager;
    #blockedJobAttributeValuesStorageKey;
    #blockedJobAttributeValues;

    constructor(
      jobAttribute,
      jobBoardId,
      jobRegistrar,
      jobBlockElementSupplier,
      jobBlockElementInserter,
      jobAttributeValueGetter,
      jobDisplayManager,
      storage
    ) {
      this.#jobAttribute = jobAttribute;
      this.#jobBoardId = jobBoardId;
      this.#jobRegistrar = jobRegistrar;
      this.#jobBlockElementSupplier = jobBlockElementSupplier;
      this.#jobBlockElementInserter = jobBlockElementInserter;
      this.#jobAttributeValueGetter = jobAttributeValueGetter;
      this.#jobDisplayManager = jobDisplayManager;

      this.#blockedJobAttributeValuesStorageKey = Utilities.getStorageKeyName(
        this.constructor.name,
        this.#jobBoardId,
        this.#jobAttribute,
        "blockedJobAttributeValues"
      );
      this.#blockedJobAttributeValues = new Set(
        storage[this.#blockedJobAttributeValuesStorageKey]
      );

      JobAttributeManager.addBlockedJobAttributeValueStorageKey(
        this.#blockedJobAttributeValuesStorageKey
      );

      const initialStoragePropertiesToSet = [
        this.#blockedJobAttributeValuesStorageKey,
        `${this.#blockedJobAttributeValuesStorageKey}.backup`,
      ]
        .filter((storageKey) => !Object.hasOwn(storage, storageKey))
        .map((storageKey) => [storageKey, []]);

      if (initialStoragePropertiesToSet.length)
        chrome.storage.local.set(
          Object.fromEntries(initialStoragePropertiesToSet)
        );
    }

    start() {
      this.#subscribeToJobRegistrar();
      this.#startStorageListener();
    }

    #subscribeToJobRegistrar() {
      this.#jobRegistrar.startNewJobSubscription((jobElement) =>
        this.#processJobElement(jobElement)
      );
    }

    #jobAttributeValuesToJobElementsMap = new Map();
    #jobElementToJobBlockElementsMap = new WeakMap();
    #processJobElement(jobElement) {
      if (this.#jobElementToJobBlockElementsMap.has(jobElement)) {
        const { jobBlockElement } =
          this.#jobElementToJobBlockElementsMap.get(jobElement);
        if (jobBlockElement.isConnected) return;
        return this.#jobBlockElementInserter.insertJobBlockElement(
          jobElement,
          jobBlockElement
        );
      }

      const jobAttributeValue =
        this.#jobAttributeValueGetter.getJobAttributeValue(jobElement);

      if (!jobAttributeValue) return;

      const mapContainsJobAttributeValue =
        this.#jobAttributeValuesToJobElementsMap.has(jobAttributeValue);

      if (!mapContainsJobAttributeValue) {
        this.#jobAttributeValuesToJobElementsMap.set(jobAttributeValue, [
          jobElement,
        ]);
      } else if (mapContainsJobAttributeValue) {
        const jobElementsWithJobAttributeValue =
          this.#jobAttributeValuesToJobElementsMap.get(jobAttributeValue);
        jobElementsWithJobAttributeValue.push(jobElement);
      }

      const jobBlockElements = {};

      const jobBlockElement =
        this.#jobBlockElementSupplier.getJobBlockElement(jobElement);
      jobBlockElement.dataset.jobBoardId = this.#jobBoardId;
      jobBlockElements.jobBlockElement = jobBlockElement;

      if (this.#jobAttribute === "companyName")
        jobBlockElement
          .querySelector(".job-block-block-button")
          .addEventListener("click", () =>
            this.#toggleJobAttributeValue(jobAttributeValue)
          );

      const jobAttributeToggleButtonElement =
        this.#jobBlockElementSupplier.getJobBlockToggleButtonElement(
          jobAttributeValue
        );

      jobAttributeToggleButtonElement.dataset.jobAttribute = this.#jobAttribute;

      const jobAttributeValueIsBlocked =
        this.#getThisJobAttributeValueIsBlocked(jobAttributeValue);

      this.#updateJobAttributeToggleButtonElementDataAttribute(
        jobAttributeToggleButtonElement,
        jobAttributeValueIsBlocked
      );

      jobAttributeToggleButtonElement.addEventListener("click", () =>
        this.#toggleJobAttributeValue(jobAttributeValue)
      );

      jobBlockElement
        .querySelector(".job-block-blocked-job-overlay")
        .insertAdjacentElement("afterbegin", jobAttributeToggleButtonElement);

      jobBlockElements.jobAttributeToggleButtonElement =
        jobAttributeToggleButtonElement;

      const successfullyInserted =
        this.#jobBlockElementInserter.insertJobBlockElement(
          jobElement,
          jobBlockElement
        );

      if (!successfullyInserted) return;

      this.#updateJobBlockElementDataAttribute(jobBlockElement);

      this.#jobElementToJobBlockElementsMap.set(jobElement, jobBlockElements);
    }

    #getThisJobAttributeValueIsBlocked(jobAttributeValue) {
      return this.#blockedJobAttributeValues.has(jobAttributeValue);
    }

    #updateJobAttributeToggleButtonElementDataAttribute(
      jobAttributeToggleButtonElement,
      jobAttributeValueIsBlocked
    ) {
      jobAttributeToggleButtonElement.dataset.jobAttributeValueBlocked =
        jobAttributeValueIsBlocked ? true : false;
    }

    #updateJobBlockElementDataAttribute(jobBlockElement) {
      const someJobAttributeValuesAreBlocked = jobBlockElement.querySelectorAll(
        "[data-job-attribute-value-blocked='true']"
      ).length;

      jobBlockElement.dataset.jobBlockBlockedJob =
        someJobAttributeValuesAreBlocked ? true : false;

      if (!this.#jobDisplayManager.removeHiddenJobs) return;

      someJobAttributeValuesAreBlocked
        ? jobDisplayManager.removeHiddenJob(jobBlockElement)
        : jobDisplayManager.unremoveHiddenJob(jobBlockElement);
    }

    #startStorageListener() {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const containsChangesToThisJobAttribute = Object.hasOwn(
          storageChanges,
          this.#blockedJobAttributeValuesStorageKey
        );
        if (!containsChangesToThisJobAttribute) return;

        const blockedJobAttributeValuesFromStorage = new Set(
          storageChanges[this.#blockedJobAttributeValuesStorageKey].newValue
        );

        const mergedjobAttributeValueChanges = new Map([
          ...[...blockedJobAttributeValuesFromStorage]
            .filter(
              (jobAttributeValue) =>
                !this.#blockedJobAttributeValues.has(jobAttributeValue)
            )
            .map((blockedJobAttributeValue) => [
              blockedJobAttributeValue,
              "block",
            ]),
          ...[...this.#blockedJobAttributeValues]
            .filter(
              (jobAttributeValue) =>
                !blockedJobAttributeValuesFromStorage.has(jobAttributeValue)
            )
            .map((unblockedJobAttributeValue) => [
              unblockedJobAttributeValue,
              "unblock",
            ]),
          ...this.#changesPendingExport,
        ]);

        if (!mergedjobAttributeValueChanges.size) return;

        mergedjobAttributeValueChanges.forEach((action, jobAttributeValue) =>
          action === "block"
            ? this.#blockJobAttributeValue(jobAttributeValue, false)
            : this.#unblockJobAttributeValue(jobAttributeValue, false)
        );
      });
    }

    #toggleJobAttributeValue(jobAttributeValue) {
      this.#getThisJobAttributeValueIsBlocked(jobAttributeValue)
        ? this.#unblockJobAttributeValue(jobAttributeValue)
        : this.#blockJobAttributeValue(jobAttributeValue);
    }

    #blockJobAttributeValue(jobAttributeValue, updateStorage = true) {
      if (this.#blockedJobAttributeValues.has(jobAttributeValue)) return;
      this.#blockedJobAttributeValues.add(jobAttributeValue);
      this.#updateJobBlockElementsWithJobAttributeValue(jobAttributeValue);
      if (!updateStorage) return;
      this.#changesPendingExport.set(jobAttributeValue, "block");
      this.#exportBlockedJobAttributeValuesToStorage();
    }

    #unblockJobAttributeValue(jobAttributeValue, updateStorage = true) {
      const jobAttributeWasBlocked =
        this.#blockedJobAttributeValues.delete(jobAttributeValue);
      if (!jobAttributeWasBlocked) return;
      this.#updateJobBlockElementsWithJobAttributeValue(jobAttributeValue);
      if (!updateStorage) return;
      this.#changesPendingExport.set(jobAttributeValue, "unblock");
      this.#exportBlockedJobAttributeValuesToStorage();
    }

    #updateJobBlockElementsWithJobAttributeValue(jobAttributeValue) {
      const jobElementsWithJobAttributeValue =
        this.#jobAttributeValuesToJobElementsMap.get(jobAttributeValue);
      if (!jobElementsWithJobAttributeValue) return;

      const freshJobElementsWithJobAttributeValue =
        this.#removeStaleJobElements(jobElementsWithJobAttributeValue);

      const jobAttributeValueIsBlocked =
        this.#getThisJobAttributeValueIsBlocked(jobAttributeValue);

      freshJobElementsWithJobAttributeValue.forEach(
        (freshJobElementWithJobAttributeValue) => {
          const { jobBlockElement, jobAttributeToggleButtonElement } =
            this.#jobElementToJobBlockElementsMap.get(
              freshJobElementWithJobAttributeValue
            );
          this.#updateJobAttributeToggleButtonElementDataAttribute(
            jobAttributeToggleButtonElement,
            jobAttributeValueIsBlocked
          );
          this.#updateJobBlockElementDataAttribute(jobBlockElement);
        }
      );
    }

    #removeStaleJobElements(jobElements) {
      jobElements = jobElements.filter((jobElement) => jobElement.isConnected);
      return jobElements;
    }

    #changesPendingExport = new Map();
    #exportBlockedJobAttributeValuesToStorage() {
      const clearedBackupProperties = Object.fromEntries(
        JobAttributeManager.getBlockedJobAttributeValueStorageKeys().map(
          (blockedJobAttributeValueStorageKey) => [
            `${blockedJobAttributeValueStorageKey}.backup`,
            [],
          ]
        )
      );

      const storageChanges = Object.assign(
        {
          [this.#blockedJobAttributeValuesStorageKey]: [
            ...this.#blockedJobAttributeValues,
          ],
        },
        clearedBackupProperties
      );

      chrome.storage.local.set(storageChanges);

      this.#changesPendingExport.clear();
    }
  }

  if (window.jobBlockContentScriptHasBeenInjected) return;

  window.jobBlockContentScriptHasBeenInjected = true;

  const jobBoardId = JobBoards.getJobBoardIdByHostname();

  if (!jobBoardId) return;

  await chrome.runtime.sendMessage({
    from: "content script",
    to: ["background script"],
    body: "inject css",
  });

  const initialStorage = await chrome.storage.local.get();
  const jobBoardSelectors = new JobBoardSelectors(jobBoardId);
  const jobRegistrar = new JobRegistrar(
    jobBoardId,
    jobBoardSelectors.selectors.jobElement
  );
  const jobBlockElementSupplier = new JobBlockElementSupplier();
  const jobBlockElementInserter = new JobBlockElementInserter(
    jobBoardId,
    jobBoardSelectors.selectors.baseElementOfJobElement
  );
  const jobDisplayManager = new JobDisplayManager(
    jobBoardId,
    jobBoardSelectors.selectors.baseElementOfJobElement,
    initialStorage
  ).start();
  const jobAttributeManagers = JobAttributeManager.getJobAttributes(
    jobBoardId
  ).map(
    (jobAttribute) =>
      new JobAttributeManager(
        jobAttribute,
        jobBoardId,
        jobRegistrar,
        jobBlockElementSupplier,
        jobBlockElementInserter,
        new JobAttributeValueGetter(
          jobBoardId,
          jobAttribute,
          jobBoardSelectors.selectors[jobAttribute],
          jobBoardSelectors.selectors.baseElementOfJobElement
        ),
        jobDisplayManager,
        initialStorage
      )
  );

  await Promise.all(
    jobAttributeManagers.map((jobAttributeManager) =>
      jobAttributeManager.start()
    )
  );

  jobRegistrar.startRegisteringJobs();
})();
