(async () => {
  class Utilities {
    static getStorageKeyName(jobBlockComponent, jobBoard, ...otherIdentifiers) {
      return [jobBlockComponent, jobBoard, ...otherIdentifiers].join(".");
    }
  }

  class JobBoards {
    static #jobBoards = [
      {
        hostname: "glassdoor.com",
        jobBoardId: "glassdoor",
        attributes: [
          {
            name: "companyName",
            get(jobElement) {
              return (
                jobElement
                  .querySelector(".EmployerProfile_compactEmployerName__LE242")
                  ?.textContent.replaceAll("\n", "")
                  .trim() || "Unknown Company"
              );
            },
          },
        ],
        getJobElements() {
          return document.querySelectorAll("li[data-test='jobListing']");
        },
      },
      {
        hostname: "indeed.com",
        jobBoardId: "indeed",
        attributes: [
          {
            name: "companyName",
            get(jobElement) {
              return (
                jobElement
                  .querySelector(".companyName, [data-testid='company-name']")
                  ?.textContent.replaceAll("\n", "")
                  .trim() || "Unknown Company"
              );
            },
          },
          {
            name: "promotionalStatus",
            get(jobElement) {
              return jobElement.querySelector(".sponsoredJob")
                ? "Promoted"
                : "";
            },
          },
        ],
        getJobElements() {
          return document.querySelectorAll("li:has(.result)");
        },
      },
      {
        hostname: "linkedin.com",
        jobBoardId: "linkedIn",
        attributes: [
          {
            name: "companyName",
            get(jobElement) {
              return (
                jobElement
                  .querySelector(
                    ".job-card-container__primary-description, .job-card-container__company-name, .base-search-card__subtitle"
                  )
                  ?.textContent.replaceAll("\n", "")
                  .trim() || "Unknown Company"
              );
            },
          },
          {
            name: "promotionalStatus",
            get(jobElement) {
              return jobElement.querySelector("time") ? "" : "Promoted";
            },
          },
        ],
        getJobElements() {
          return document.querySelectorAll(
            "li:has(.job-card-container, .job-search-card)"
          );
        },
      },
    ];

    static getJobBoardByHostname(hostname = location.hostname) {
      return this.#jobBoards.find(
        (jobBoard) =>
          hostname.endsWith(`.${jobBoard.hostname}`) ||
          hostname === jobBoard.hostname
      );
    }
  }

  class ElementManager {
    #jobElementObserver = new MutationObserver(() => this.processElements());
    #jobBlockElementMap = new WeakMap();

    constructor(jobBoard, jobAttributeManagers, storage) {
      this.jobBoard = jobBoard;
      this.attributeManagers = jobAttributeManagers;
      this.removeHiddenJobsStorageKey = Utilities.getStorageKeyName(
        "JobDisplayManager",
        this.jobBoard.jobBoardId,
        "removeHiddenJobs"
      );
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
            jobBoardId: this.jobBoard.jobBoardId,
          });
      });

      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const containsChangesToRemoveHiddenJobs = Object.hasOwn(
          storageChanges,
          this.removeHiddenJobsStorageKey
        );

        if (!containsChangesToRemoveHiddenJobs) return;

        document.documentElement.setAttribute(
          "data-hns-remove-hidden-jobs",
          storageChanges[this.removeHiddenJobsStorageKey].newValue
        );
      });

      this.processElements();

      addEventListener("pageshow", (pageTransitionEvent) => {
        if (!pageTransitionEvent.persisted) return;

        chrome.runtime.sendMessage({
          from: "content script",
          to: ["background script", "popup script"],
          body: "bfcache used",
          jobBoardId: this.jobBoard.jobBoardId,
          hasHideNSeekUI: this.hasHideNSeekUI,
        });
      });

      this.#jobElementObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });

      return this;
    }

    processElements() {
      this.jobBoard
        .getJobElements()
        .forEach((jobElement) => this.processJobElement(jobElement));

      const hasHideNSeekUI = Boolean(
        document.querySelector(".job-block-element")
      );
      const hideNSeekUIChanged = hasHideNSeekUI !== this.hasHideNSeekUI;
      if (hideNSeekUIChanged) this.notifyScripts(hasHideNSeekUI);
    }

    processJobElement(jobElement) {
      const existingJobBlockElement = this.#jobBlockElementMap.get(jobElement);
      if (existingJobBlockElement?.isConnected) return;

      const newJobBlockElement = this.createJobBlockElement();
      this.#jobBlockElementMap.set(jobElement, newJobBlockElement);

      this.attributeManagers.forEach((attributeManager) =>
        attributeManager.processJobBlockElement(newJobBlockElement, jobElement)
      );

      jobElement.setAttribute("data-hns-job-element", "");
      jobElement.append(newJobBlockElement);
    }

    createJobBlockElement() {
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
        chrome.runtime.getURL("images/hide-button-icon.svg")
      );
      jobBlockBlockButtonIcon.ondragstart = (dragEvent) =>
        dragEvent.preventDefault();

      jobBlockBlockButton.append(jobBlockBlockButtonIcon);
      jobBlockOverlayUnblockedJob.append(jobBlockBlockButton);
      jobBlockElement.append(
        jobBlockOverlayUnblockedJob,
        jobBlockOverlayBlockedJob
      );

      return jobBlockElement;
    }

    notifyScripts(hasHideNSeekUI) {
      chrome.runtime.sendMessage({
        from: "content script",
        to: ["background script", "popup script"],
        body: "hasHideNSeekUI changed",
        jobBoardId: this.jobBoard.jobBoardId,
        hasHideNSeekUI,
      });

      this.hasHideNSeekUI = hasHideNSeekUI;
    }
  }

  class JobAttributeManager {
    static blockedJobAttributeValueStorageKeys = new Set();

    #jobBlockElementToToggleButtonMap = new WeakMap();
    #changesPendingExport = new Map();

    constructor(jobBoard, jobAttribute, storage) {
      this.jobBoardId = jobBoard.jobBoardId;
      this.getJobAttributeValue = jobBoard.attributes.find(
        ({ name }) => name === jobAttribute
      ).get;
      this.jobAttribute = jobAttribute;

      this.blockedJobAttributeValuesStorageKey = Utilities.getStorageKeyName(
        "JobAttributeManager",
        jobBoard.jobBoardId,
        jobAttribute,
        "blockedJobAttributeValues"
      );
      this.blockedJobAttributeValues = new Set(
        storage[this.blockedJobAttributeValuesStorageKey]
      );

      JobAttributeManager.blockedJobAttributeValueStorageKeys.add(
        this.blockedJobAttributeValuesStorageKey
      );

      const storagePropertiesToSet = [
        this.blockedJobAttributeValuesStorageKey,
        `${this.blockedJobAttributeValuesStorageKey}.backup`,
      ]
        .filter((storageKey) => !Object.hasOwn(storage, storageKey))
        .map((storageKey) => [storageKey, []]);

      if (storagePropertiesToSet.length)
        chrome.storage.local.set(Object.fromEntries(storagePropertiesToSet));
    }

    start() {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const containsChangesToThisJobAttribute = Object.hasOwn(
          storageChanges,
          this.blockedJobAttributeValuesStorageKey
        );
        if (!containsChangesToThisJobAttribute) return;

        const blockedJobAttributeValuesFromStorage = new Set(
          storageChanges[this.blockedJobAttributeValuesStorageKey].newValue
        );

        const mergedJobAttributeValueChanges = new Map([
          ...[...blockedJobAttributeValuesFromStorage]
            .filter(
              (blockedJobAttributeValueFromStorage) =>
                !this.blockedJobAttributeValues.has(
                  blockedJobAttributeValueFromStorage
                )
            )
            .map((blockedJobAttributeValue) => [
              blockedJobAttributeValue,
              "block",
            ]),
          ...[...this.blockedJobAttributeValues]
            .filter(
              (blockedJobAttributeValue) =>
                !blockedJobAttributeValuesFromStorage.has(
                  blockedJobAttributeValue
                )
            )
            .map((unblockedJobAttributeValue) => [
              unblockedJobAttributeValue,
              "unblock",
            ]),
          ...this.#changesPendingExport,
        ]);

        if (!mergedJobAttributeValueChanges.size) return;

        mergedJobAttributeValueChanges.forEach((action, jobAttributeValue) =>
          action === "block"
            ? this.blockJobAttributeValue(jobAttributeValue, false)
            : this.unblockJobAttributeValue(jobAttributeValue, false)
        );
      });

      return this;
    }

    processJobBlockElement(jobBlockElement, jobElement) {
      const existingToggleButton =
        this.#jobBlockElementToToggleButtonMap.get(jobBlockElement);
      if (existingToggleButton) return;

      const jobAttributeValue = this.getJobAttributeValue(jobElement);

      if (!jobAttributeValue) return;

      jobBlockElement.setAttribute("data-hns-job-board-id", this.jobBoardId);

      if (this.jobAttribute === "companyName")
        jobBlockElement
          .querySelector(".job-block-block-button")
          .addEventListener("click", () =>
            this.blockJobAttributeValue(jobAttributeValue)
          );

      const toggleButtonElement =
        this.createToggleButtonElement(jobAttributeValue);
      this.#jobBlockElementToToggleButtonMap.set(
        jobBlockElement,
        toggleButtonElement
      );
      toggleButtonElement.setAttribute("data-hns-attribute", this.jobAttribute);

      const jobAttributeValueIsBlocked =
        this.getJobAttributeValueIsBlocked(jobAttributeValue);

      this.updateToggleButton(toggleButtonElement, jobAttributeValueIsBlocked);

      toggleButtonElement.addEventListener("click", () =>
        this.toggleJobAttributeValue(jobAttributeValue)
      );

      jobBlockElement
        .querySelector(".job-block-blocked-job-overlay")
        .prepend(toggleButtonElement);
    }

    createToggleButtonElement(jobAttributeValue) {
      const toggleButtonElement = document.createElement("button");
      toggleButtonElement.classList.add("job-block-attribute-toggle-button");
      toggleButtonElement.setAttribute("title", jobAttributeValue);
      toggleButtonElement.setAttribute(
        "data-hns-attribute-value",
        jobAttributeValue
      );

      const toggleButtonTextElement = document.createElement("div");
      toggleButtonTextElement.classList.add(
        "job-block-attribute-toggle-button-text"
      );
      toggleButtonTextElement.textContent = jobAttributeValue;

      const toggleButtonHiddenIndicator = document.createElement("div");
      toggleButtonHiddenIndicator.classList.add(
        "job-block-attribute-toggle-button-hidden-indicator"
      );
      toggleButtonHiddenIndicator.textContent = "Hidden";

      toggleButtonElement.append(
        toggleButtonTextElement,
        toggleButtonHiddenIndicator
      );

      return toggleButtonElement;
    }

    getJobAttributeValueIsBlocked(jobAttributeValue) {
      return this.blockedJobAttributeValues.has(jobAttributeValue);
    }

    updateToggleButton(toggleButtonElement, jobAttributeValueIsBlocked) {
      toggleButtonElement.setAttribute(
        "data-hns-blocked-attribute",
        jobAttributeValueIsBlocked
      );
    }

    toggleJobAttributeValue(jobAttributeValue) {
      this.getJobAttributeValueIsBlocked(jobAttributeValue)
        ? this.unblockJobAttributeValue(jobAttributeValue)
        : this.blockJobAttributeValue(jobAttributeValue);
    }

    blockJobAttributeValue(jobAttributeValue, updateStorage = true) {
      if (this.blockedJobAttributeValues.has(jobAttributeValue)) return;
      this.blockedJobAttributeValues.add(jobAttributeValue);
      this.updateToggleButtonsWithJobAttributeValue(jobAttributeValue);
      if (!updateStorage) return;
      this.#changesPendingExport.set(jobAttributeValue, "block");
      this.exportBlockedJobAttributeValuesToStorage();
    }

    unblockJobAttributeValue(jobAttributeValue, updateStorage = true) {
      const jobAttributeWasBlocked =
        this.blockedJobAttributeValues.delete(jobAttributeValue);
      if (!jobAttributeWasBlocked) return;
      this.updateToggleButtonsWithJobAttributeValue(jobAttributeValue);
      if (!updateStorage) return;
      this.#changesPendingExport.set(jobAttributeValue, "unblock");
      this.exportBlockedJobAttributeValuesToStorage();
    }

    updateToggleButtonsWithJobAttributeValue(jobAttributeValue) {
      const toggleButtonsWithJobAttributeValue = document.querySelectorAll(
        `.job-block-element [data-hns-attribute-value="${jobAttributeValue}"]`
      );

      if (!toggleButtonsWithJobAttributeValue.length) return;

      const jobAttributeValueIsBlocked =
        this.getJobAttributeValueIsBlocked(jobAttributeValue);

      toggleButtonsWithJobAttributeValue.forEach(
        (toggleButtonWithJobAttributeValue) =>
          this.updateToggleButton(
            toggleButtonWithJobAttributeValue,
            jobAttributeValueIsBlocked
          )
      );
    }

    exportBlockedJobAttributeValuesToStorage() {
      const clearedBackupProperties = Object.fromEntries(
        [...JobAttributeManager.blockedJobAttributeValueStorageKeys].map(
          (blockedJobAttributeValueStorageKey) => [
            `${blockedJobAttributeValueStorageKey}.backup`,
            [],
          ]
        )
      );

      const storageChanges = Object.assign(
        {
          [this.blockedJobAttributeValuesStorageKey]: [
            ...this.blockedJobAttributeValues,
          ],
        },
        clearedBackupProperties
      );

      chrome.storage.local.set(storageChanges);

      this.#changesPendingExport.clear();
    }
  }

  const jobBoard = JobBoards.getJobBoardByHostname();

  if (!jobBoard) return;

  const storage = await chrome.storage.local.get();

  const jobAttributeManagers = jobBoard.attributes.map(({ name }) =>
    new JobAttributeManager(jobBoard, name, storage).start()
  );

  new ElementManager(jobBoard, jobAttributeManagers, storage).start();
})();
