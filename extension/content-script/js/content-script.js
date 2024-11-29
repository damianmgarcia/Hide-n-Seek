(async () => {
  class Utilities {
    static getStorageKeyName(hnsComponent, jobBoardId, ...otherIdentifiers) {
      return [hnsComponent, jobBoardId, ...otherIdentifiers].join(".");
    }
  }

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
                    ".job-card-container__primary-description, .job-card-container__company-name, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle"
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
      this.removeHiddenJobsStorageKey = Utilities.getStorageKeyName(
        "JobDisplayManager",
        this.jobBoard.id,
        "removeHiddenJobs"
      );
      document.documentElement.setAttribute(
        "data-hns-remove-hidden-jobs",
        storage[this.removeHiddenJobsStorageKey] || false
      );

      this.hnsElementTemplate = document.createElement("template");
      this.hnsElementTemplate.innerHTML = `
        <div class="hns-element" style="display: none;">
          <div class="hns-unblocked-job-overlay">
            <div class="hns-block-button">
              <svg viewBox="1.196 4.287 42.55 42.55">
                <path/>
              </svg>
            </div>
          </div>
          <div class="hns-blocked-job-overlay"></div>
        </div>
      `;
    }

    start() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message.to.includes("content script")) return;

        if (message.body === "send status")
          sendResponse({
            hasContentScript: true,
            hasHideNSeekUI: this.hasHideNSeekUI,
            jobBoardId: this.jobBoard.id,
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

      const hasHideNSeekUI = Boolean(document.querySelector(".hns-element"));
      const hideNSeekUIChanged = hasHideNSeekUI !== this.hasHideNSeekUI;
      if (hideNSeekUIChanged) this.notifyScripts(hasHideNSeekUI);
    }

    processJobListing(jobListing) {
      const existingHnsElement = this.#hnsElementMap.get(jobListing);
      if (existingHnsElement?.isConnected) return;

      const newHnsElement =
        this.hnsElementTemplate.content.firstElementChild.cloneNode(true);
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

    #hnsElementToToggleButtonMap = new WeakMap();
    #changesPendingExport = new Map();

    constructor(jobBoard, jobAttribute, storage) {
      this.jobBoardId = jobBoard.id;
      this.jobAttributeConfig = jobBoard.attributes.find(
        ({ name }) => name === jobAttribute
      );
      this.jobAttribute = jobAttribute;

      this.blockedJobAttributeValuesStorageKey = Utilities.getStorageKeyName(
        "JobAttributeManager",
        jobBoard.id,
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

      this.toggleButtonTemplate = document.createElement("template");
      this.toggleButtonTemplate.innerHTML = `
        <button class="hns-block-attribute-toggle">
          <div class="hns-block-attribute-toggle-text"></div>
          <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
        </button>
      `;
    }

    start() {
      chrome.storage.local.onChanged.addListener((changes) => {
        const containsChangesToThisJobAttribute = Object.hasOwn(
          changes,
          this.blockedJobAttributeValuesStorageKey
        );
        if (!containsChangesToThisJobAttribute) return;

        const blockedJobAttributeValuesFromStorage = new Set(
          changes[this.blockedJobAttributeValuesStorageKey].newValue
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

    processHnsElement(hnsElement, jobListing) {
      const existingToggleButton =
        this.#hnsElementToToggleButtonMap.get(hnsElement);
      if (existingToggleButton) return;

      const jobAttributeValue = this.jobAttributeConfig.getValue(jobListing);

      if (!jobAttributeValue) return;

      hnsElement.setAttribute("data-hns-job-board-id", this.jobBoardId);

      if (this.jobAttribute === "companyName")
        hnsElement
          .querySelector(".hns-block-button")
          .addEventListener("click", (event) => {
            event.stopPropagation();
            this.blockJobAttributeValue(jobAttributeValue);
          });

      const toggleButtonElement =
        this.createToggleButtonElement(jobAttributeValue);
      this.#hnsElementToToggleButtonMap.set(hnsElement, toggleButtonElement);
      toggleButtonElement.setAttribute("data-hns-attribute", this.jobAttribute);

      this.updateToggleButton(toggleButtonElement, jobAttributeValue);

      toggleButtonElement.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.jobAttributeValueIsBlocked(jobAttributeValue)) {
          this.unblockJobAttributeValue(jobAttributeValue);
        } else {
          this.blockJobAttributeValue(jobAttributeValue);
        }
      });

      hnsElement
        .querySelector(".hns-blocked-job-overlay")
        .prepend(toggleButtonElement);
    }

    createToggleButtonElement(jobAttributeValue) {
      const toggleButtonElement =
        this.toggleButtonTemplate.content.firstElementChild.cloneNode(true);
      toggleButtonElement.title = jobAttributeValue;
      toggleButtonElement.setAttribute(
        "data-hns-attribute-value",
        jobAttributeValue
      );
      toggleButtonElement.querySelector(
        ".hns-block-attribute-toggle-text"
      ).textContent = jobAttributeValue;

      return toggleButtonElement;
    }

    jobAttributeValueIsBlocked(jobAttributeValue) {
      return this.blockedJobAttributeValues.has(jobAttributeValue);
    }

    updateToggleButton(toggleButtonElement, jobAttributeValue) {
      toggleButtonElement.setAttribute(
        "data-hns-blocked-attribute",
        this.jobAttributeValueIsBlocked(jobAttributeValue)
      );
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
        `.hns-element [data-hns-attribute-value="${jobAttributeValue}"]`
      );

      if (!toggleButtonsWithJobAttributeValue.length) return;

      toggleButtonsWithJobAttributeValue.forEach(
        (toggleButtonWithJobAttributeValue) =>
          this.updateToggleButton(
            toggleButtonWithJobAttributeValue,
            jobAttributeValue
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

  const localStorage = await chrome.storage.local.get();

  const jobAttributeManagers = jobBoard.attributes.map(({ name }) =>
    new JobAttributeManager(jobBoard, name, localStorage).start()
  );

  new JobListingManager(jobBoard, jobAttributeManagers, localStorage).start();
})();
