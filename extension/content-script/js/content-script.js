(async () => {
  class Utilities {
    static getStorageKeyName(jobBlockComponent, jobBoard, ...otherIdentifiers) {
      return [jobBlockComponent, jobBoard, ...otherIdentifiers].join(".");
    }
  }

  class JobBoardData {
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

  class JobRegistrar {
    #selectors;
    constructor(jobBoardId) {
      const selectors = {
        linkedIn: {
          jobElement: ".job-card-container",
          jobElementsContainer: ".jobs-search-results-list",
        },
        indeed: {
          jobElement: ".jobsearch-ResultsList .result",
          jobElementsContainer: ".jobsearch-ResultsList",
        },
      };
      this.#selectors = selectors[jobBoardId];
    }

    #subscriberCallbacks = [];
    startNewJobSubscription(callback) {
      this.#subscriberCallbacks.push(callback);
    }

    #sendNewJobToSubscribers(job) {
      this.#subscriberCallbacks.forEach((subscriberCallback) =>
        subscriberCallback(job)
      );
    }

    #jobRegister = new WeakSet();
    #registerJob(job) {
      this.#jobRegister.add(job);
      this.#sendNewJobToSubscribers(job);
    }

    #jobRegistrar = new MutationObserver((records) => {
      const jobElements = records
        .filter((record) => record.target.matches(this.#selectors.jobElement))
        .map((record) => record.target);
      jobElements.forEach((jobElement) => this.#registerJob(jobElement));
    });

    startRegisteringJobs() {
      document
        .querySelectorAll(this.#selectors.jobElement)
        .forEach((jobElement) => this.#registerJob(jobElement));

      this.#jobRegistrar.observe(
        document.querySelector(this.#selectors.jobElementsContainer),
        {
          subtree: true,
          childList: true,
        }
      );
    }
  }

  class JobDisplayManager {
    #jobBlockElementClosestSelector;
    #removeHiddenJobs;
    #removeHiddenJobsStorageKey;

    constructor(jobBoardId, storage) {
      const jobBlockElementClosestSelector = {
        linkedIn: "li",
        indeed: "li",
      };
      this.#jobBlockElementClosestSelector =
        jobBlockElementClosestSelector[jobBoardId];

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

    removeHiddenJob(jobBlockElement) {
      jobBlockElement
        .closest(this.#jobBlockElementClosestSelector)
        .style.setProperty("display", "none");
    }

    unremoveHiddenJob(jobBlockElement) {
      jobBlockElement
        .closest(this.#jobBlockElementClosestSelector)
        .style.removeProperty("display");
    }
  }

  class JobBlockElementSupplier {
    #jobElementToJobBlockElementMap = new WeakMap();
    getJobBlockElement(jobElement) {
      if (this.#jobElementToJobBlockElementMap.has(jobElement))
        return this.#jobElementToJobBlockElementMap.get(jobElement);

      const jobBlockElement = document.createElement("div");
      jobBlockElement.classList.add("job-block-element");

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

      jobAttributeToggleButtonElement.insertAdjacentElement(
        "afterbegin",
        jobAttributeToggleButtonTextElement
      );

      return jobAttributeToggleButtonElement;
    }
  }

  class JobBlockElementInserter {
    insertJobBlockElement;
    constructor(jobBoardId) {
      const jobBlockElementInserters = {
        linkedIn: (jobElement, jobBlockElement) =>
          jobElement.insertAdjacentElement("beforebegin", jobBlockElement),
        indeed: (jobElement, jobBlockElement) =>
          jobElement.insertAdjacentElement("beforeend", jobBlockElement),
      };
      this.insertJobBlockElement = jobBlockElementInserters[jobBoardId];
    }
  }

  class JobElementDataGetter {
    getJobElementData;
    constructor(jobBoardId, jobAttribute) {
      const jobElementDataGetters = {
        linkedIn: {
          companyName: (jobElement) => {
            const jobAttributeValue = jobElement
              .querySelector(".job-card-container__company-name")
              ?.textContent.replaceAll("\n", "")
              .trim();
            return {
              jobAttributeValue,
              toggleButtonShouldBeAdded: !!jobAttributeValue,
              toggleButtonText: jobAttributeValue,
            };
          },
          promotionalStatus: (jobElement) => {
            const jobAttributeValue = jobElement.querySelector("time")
              ? "Not Promoted"
              : "Promoted";
            return {
              jobAttributeValue,
              toggleButtonShouldBeAdded: jobAttributeValue === "Promoted",
              toggleButtonText: jobAttributeValue,
            };
          },
        },
        indeed: {
          companyName: (jobElement) => {
            const jobAttributeValue = jobElement
              .querySelector(".companyName")
              ?.textContent.replaceAll("\n", "")
              .trim();
            return {
              jobAttributeValue,
              toggleButtonShouldBeAdded: !!jobAttributeValue,
              toggleButtonText: jobAttributeValue,
            };
          },
          promotionalStatus: (jobElement) => {
            const jobAttributeValue = jobElement.matches(".sponsoredJob")
              ? "Not Sponsored"
              : "Sponsored";
            return {
              jobAttributeValue,
              toggleButtonShouldBeAdded: jobAttributeValue === "Sponsored",
              toggleButtonText: jobAttributeValue,
            };
          },
        },
      };
      this.getJobElementData = jobElementDataGetters[jobBoardId][jobAttribute];
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
    #jobElementDataGetter;
    #jobDisplayManager;
    #blockedJobAttributeValuesStorageKey;
    #blockedJobAttributeValues;

    constructor(
      jobAttribute,
      jobBoardId,
      jobRegistrar,
      jobBlockElementSupplier,
      jobBlockElementInserter,
      jobElementDataGetter,
      jobDisplayManager,
      storage
    ) {
      this.#jobAttribute = jobAttribute;
      this.#jobBoardId = jobBoardId;
      this.#jobRegistrar = jobRegistrar;
      this.#jobBlockElementSupplier = jobBlockElementSupplier;
      this.#jobBlockElementInserter = jobBlockElementInserter;
      this.#jobElementDataGetter = jobElementDataGetter;
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

      const { jobAttributeValue, toggleButtonShouldBeAdded, toggleButtonText } =
        this.#jobElementDataGetter.getJobElementData(jobElement);

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
      jobBlockElements.jobBlockElement = jobBlockElement;

      if (this.#jobAttribute === "companyName")
        jobBlockElement
          .querySelector(".job-block-block-button")
          .addEventListener("click", () =>
            this.#toggleJobAttributeValue(jobAttributeValue)
          );

      if (toggleButtonShouldBeAdded) {
        const jobAttributeToggleButtonElement =
          this.#jobBlockElementSupplier.getJobBlockToggleButtonElement(
            toggleButtonText
          );

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
      }

      this.#jobBlockElementInserter.insertJobBlockElement(
        jobElement,
        jobBlockElement
      );

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
      chrome.storage.local.onChanged.addListener((changes) => {
        const containsChangesToThisJobAttribute = Object.hasOwn(
          changes,
          this.#blockedJobAttributeValuesStorageKey
        );
        if (!containsChangesToThisJobAttribute) return;

        const blockedJobAttributeValuesFromStorage = new Set(
          changes[this.#blockedJobAttributeValuesStorageKey].newValue
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

  const jobBoardId = JobBoardData.getJobBoardIdByHostname();

  if (!jobBoardId) return;

  await chrome.runtime.sendMessage({ text: "inject css" });

  const initialStorage = await chrome.storage.local.get();
  const jobRegistrar = new JobRegistrar(jobBoardId);
  const jobBlockElementSupplier = new JobBlockElementSupplier();
  const jobBlockElementInserter = new JobBlockElementInserter(jobBoardId);
  const jobDisplayManager = new JobDisplayManager(jobBoardId, initialStorage);
  jobDisplayManager.start();
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
        new JobElementDataGetter(jobBoardId, jobAttribute),
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
