(async () => {
  const jobBoard2 = await chrome.runtime.sendMessage({
    from: "content script",
    to: ["background script"],
    body: "send job board",
    data: location.hostname,
  });

  console.log(jobBoard2);

  class JobBoards {
    static #jobBoards = [
      {
        hostname: "glassdoor.com",
        id: "glassdoor",
        attributes: [
          {
            name: "companyName",
            getValue(jobListing) {
              return (
                jobListing
                  .querySelector(
                    ".EmployerProfile_compactEmployerName__LE242, .EmployerProfile_compactEmployerName__9MGcV"
                  )
                  ?.textContent.trim() || "Unknown Company"
              );
            },
          },
        ],
        getJobListings() {
          return document.querySelectorAll("li[data-test='jobListing']");
        },
      },
      {
        hostname: "indeed.com",
        id: "indeed",
        attributes: [
          {
            name: "companyName",
            getValue(jobListing) {
              return (
                jobListing
                  .querySelector(".companyName, [data-testid='company-name']")
                  ?.textContent.trim() || "Unknown Company"
              );
            },
          },
          {
            name: "promotionalStatus",
            getValue(jobListing) {
              return jobListing.querySelector(".sponsoredJob")
                ? "Promoted"
                : "";
            },
          },
        ],
        getJobListings() {
          return document.querySelectorAll("li:has(.result)");
        },
      },
      {
        hostname: "linkedin.com",
        id: "linkedIn",
        attributes: [
          {
            name: "companyName",
            getValue(jobListing) {
              return (
                jobListing
                  .querySelector(
                    ".job-card-container__primary-description, .job-card-container__company-name, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle > span"
                  )
                  ?.textContent.trim()
                  .replace(/\s*·\s*.*$/, "") || "Unknown Company"
              );
            },
          },
          {
            name: "promotionalStatus",
            getValue(jobListing) {
              const promotedTranslations = [
                "الترويج" /* Arabic */,
                "প্রমোটেড" /* Bangla */,
                "推广" /* Chinese (Simplified) */,
                "已宣傳" /* Chinese (Traditional) */,
                "Propagováno" /* Czech */,
                "Promoveret" /* Danish */,
                "Gepromoot" /* Dutch */,
                "Promoted" /* English */,
                "Mainostettu" /* Finnish */,
                "Promu\\(e\\)" /* French */,
                "Anzeige" /* German */,
                "Προωθημένη" /* Greek */,
                "प्रमोट किया गया" /* Hindi */,
                "Kiemelt" /* Hungarian */,
                "Dipromosikan" /* Indonesian */,
                "Promosso" /* Italian */,
                "プロモーション" /* Japanese */,
                "프로모션" /* Korean */,
                "Dipromosikan" /* Malay */,
                "प्रमोट केले" /* Marathi */,
                "Promotert" /* Norwegian */,
                "Promowana oferta pracy" /* Polish */,
                "Promovida" /* Portuguese */,
                "ਪ੍ਰੋਮੋਟ ਕੀਤਾ" /* Punjabi */,
                "Promovat" /* Romanian */,
                "Продвигается" /* Russian */,
                "Promocionado" /* Spanish */,
                "Marknadsfört" /* Swedish */,
                "Na-promote" /* Tagalog */,
                "ప్రమోట్ చేయబడింది" /* Telugu */,
                "โปรโมทแล้ว" /* Thai */,
                "Tanıtıldı" /* Turkish */,
                "Просувається" /* Ukrainian */,
                "Được quảng bá" /* Vietnamese */,
              ];
              return new RegExp(promotedTranslations.join("|")).test(
                jobListing.querySelector(
                  ".job-card-list__footer-wrapper, .job-card-container__footer-wrapper"
                )?.textContent
              )
                ? "Promoted"
                : "";
            },
          },
        ],
        getJobListings() {
          return document.querySelectorAll(
            "li:has(.job-card-container, .job-search-card, .job-card-job-posting-card-wrapper, [data-job-id])"
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

  class JobListingManager {
    #jobListingObserver = new MutationObserver(() => this.processJobListings());
    #hnsElementMap = new WeakMap();

    constructor(jobBoard, jobAttributeManagers, storage) {
      this.jobBoard = jobBoard;
      this.attributeManagers = jobAttributeManagers;
      this.removeHiddenJobsStorageKey = `JobDisplayManager.${this.jobBoard.id}.removeHiddenJobs`;

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
            jobBoardId: this.jobBoard.id,
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
          jobBoardId: this.jobBoard.id,
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
      this.jobBoard
        .getJobListings()
        .forEach((jobListing) => this.processJobListing(jobListing));

      chrome.runtime.sendMessage({
        from: "content script",
        to: ["background script"],
        body: "new listings",
        jobBoardId: this.jobBoard.id,
        hasHideNSeekUI: this.hasHideNSeekUI,
      });

      const hasHideNSeekUI = Boolean(document.querySelector(".hns-element"));
      const hideNSeekUIChanged = hasHideNSeekUI !== this.hasHideNSeekUI;
      if (hideNSeekUIChanged) this.notifyScripts(hasHideNSeekUI);
    }

    processJobListing(jobListing) {
      const existingHnsElement = this.#hnsElementMap.get(jobListing);
      if (existingHnsElement?.isConnected) return;

      const newHnsElement = ui.createElement("hns-element");
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
        jobBoardId: this.jobBoard.id,
        hasHideNSeekUI,
      });

      this.hasHideNSeekUI = hasHideNSeekUI;
    }
  }

  class JobAttributeManager {
    static blockedJobAttributeValueStorageKeys = new Set();

    #hnsElementToToggleMap = new WeakMap();
    #changesPendingExport = new Map();

    constructor(jobBoard, jobAttribute, storage) {
      this.jobBoardId = jobBoard.id;
      this.jobAttributeConfig = jobBoard.attributes.find(
        ({ name }) => name === jobAttribute
      );
      this.jobAttribute = jobAttribute;
      this.storageKey = `JobAttributeManager.${jobBoard.id}.${jobAttribute}.blockedJobAttributeValues`;
      this.values = new Set(storage[this.storageKey]);

      JobAttributeManager.blockedJobAttributeValueStorageKeys.add(
        this.storageKey
      );

      const storagePropertiesToSet = [
        this.storageKey,
        `${this.storageKey}.backup`,
      ]
        .filter((storageKey) => !Object.hasOwn(storage, storageKey))
        .map((storageKey) => [storageKey, []]);

      if (storagePropertiesToSet.length)
        chrome.storage.local.set(Object.fromEntries(storagePropertiesToSet));
    }

    start() {
      chrome.storage.local.onChanged.addListener((changes) => {
        const hasChangesToThisJobAttribute = Object.hasOwn(
          changes,
          this.storageKey
        );
        if (!hasChangesToThisJobAttribute) return;

        const blockedValuesFromStorage = new Set(
          changes[this.storageKey].newValue
        );

        const mergedJobAttributeValueChanges = new Map([
          ...[...blockedValuesFromStorage]
            .filter(
              (blockedJobAttributeValueFromStorage) =>
                !this.values.has(blockedJobAttributeValueFromStorage)
            )
            .map((blockedJobAttributeValue) => [
              blockedJobAttributeValue,
              "block",
            ]),
          ...[...this.values]
            .filter(
              (blockedJobAttributeValue) =>
                !blockedValuesFromStorage.has(blockedJobAttributeValue)
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
            ? this.blockValue(jobAttributeValue, false)
            : this.unblockValue(jobAttributeValue, false)
        );
      });

      return this;
    }

    processHnsElement(hnsElement, jobListing) {
      const existingToggleButton = this.#hnsElementToToggleMap.get(hnsElement);
      if (existingToggleButton) return;

      const jobAttributeValue = this.jobAttributeConfig.getValue(jobListing);

      if (!jobAttributeValue) return;

      hnsElement.setAttribute("data-hns-job-board-id", this.jobBoardId);

      if (this.jobAttribute === "companyName")
        hnsElement
          .querySelector(".hns-block-button")
          .addEventListener("click", (event) => {
            event.stopPropagation();
            this.blockValue(jobAttributeValue);
          });

      const hnsToggle = ui.createElement(
        "hns-toggle",
        this.jobAttribute,
        jobAttributeValue
      );

      this.#hnsElementToToggleMap.set(hnsElement, hnsToggle);
      hnsToggle.setAttribute("data-hns-attribute", this.jobAttribute);

      this.updateToggleButton(hnsToggle, jobAttributeValue);

      hnsToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.valueIsBlocked(jobAttributeValue)) {
          this.unblockValue(jobAttributeValue);
        } else {
          this.blockValue(jobAttributeValue);
        }
      });

      const blockedJobOverlay = hnsElement.querySelector(
        ".hns-blocked-job-overlay"
      );
      blockedJobOverlay.addEventListener("click", (pointerEvent) =>
        pointerEvent.stopPropagation()
      );
      blockedJobOverlay.prepend(hnsToggle);
    }

    valueIsBlocked(jobAttributeValue) {
      return this.values.has(jobAttributeValue);
    }

    updateToggleButton(toggleButtonElement, jobAttributeValue) {
      toggleButtonElement.setAttribute(
        "data-hns-blocked-attribute",
        this.valueIsBlocked(jobAttributeValue)
      );
    }

    blockValue(jobAttributeValue, updateStorage = true) {
      if (this.values.has(jobAttributeValue)) return;
      this.values.add(jobAttributeValue);
      this.updateTogglesWithValue(jobAttributeValue);
      if (!updateStorage) return;
      this.#changesPendingExport.set(jobAttributeValue, "block");
      this.exportBlockedJobAttributeValuesToStorage();
    }

    unblockValue(value, updateStorage = true) {
      const valueWasBlocked = this.values.delete(value);
      if (!valueWasBlocked) return;
      this.updateTogglesWithValue(value);
      if (!updateStorage) return;
      this.#changesPendingExport.set(value, "unblock");
      this.exportBlockedJobAttributeValuesToStorage();
    }

    updateTogglesWithValue(value) {
      const togglesWithValue = document.querySelectorAll(
        `.hns-element [data-hns-attribute-value="${value}"]`
      );

      if (!togglesWithValue.length) return;

      togglesWithValue.forEach((toggleWithValue) =>
        this.updateToggleButton(toggleWithValue, value)
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
          [this.storageKey]: [...this.values],
        },
        clearedBackupProperties
      );

      chrome.storage.local.set(storageChanges);

      this.#changesPendingExport.clear();
    }
  }

  const jobBoard = JobBoards.getJobBoardByHostname();

  if (!jobBoard) return;

  const localStorage = await chrome.storage.local.get();

  const jobAttributeManagers = jobBoard.attributes.map(({ name }) =>
    new JobAttributeManager(jobBoard, name, localStorage).start()
  );

  new JobListingManager(jobBoard, jobAttributeManagers, localStorage).start();
})();
