(async () => {
  class Utilities {
    static async safeAwait(functionToAwait, ...args) {
      try {
        return await functionToAwait(...args);
      } catch (error) {
        console.log(error);
      }
    }

    static async getActiveTabInCurrentWindow() {
      const [activeTabInCurrentWindow] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      return activeTabInCurrentWindow;
    }

    static initiateDownload(url, fileName) {
      const tempAnchor = document.createElement("a");
      tempAnchor.style.setProperty("display", "none");
      tempAnchor.href = url;
      tempAnchor.download = fileName;
      document.body.append(tempAnchor);
      tempAnchor.click();
      tempAnchor.remove();
    }

    static initiateUpload(handler) {
      const tempFileInput = document.createElement("input");
      tempFileInput.type = "file";
      tempFileInput.accept = "application/json";
      tempFileInput.addEventListener(
        "change",
        () => handler(tempFileInput.files),
        { once: true }
      );
      tempFileInput.click();
      tempFileInput.remove();
    }
  }

  class JobBoards {
    static #jobBoards = [
      {
        hostname: "glassdoor.com",
        jobBoardId: "glassdoor",
        jobAttributes: ["companyName"],
        logoSrc: "/images/glassdoor-logo.svg",
        logoAlt: "The Glassdoor logo",
      },
      {
        hostname: "indeed.com",
        jobBoardId: "indeed",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/indeed-logo.svg",
        logoAlt: "The Indeed logo",
      },
      {
        hostname: "linkedin.com",
        jobBoardId: "linkedIn",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/linkedin-logo.svg",
        logoAlt: "The LinkedIn logo",
      },
    ];

    static getJobBoardIdByHostname(hostname = "") {
      return this.#jobBoards.find(
        (jobBoard) =>
          hostname.endsWith(`.${jobBoard.hostname}`) ||
          hostname === jobBoard.hostname
      )?.jobBoardId;
    }

    static getJobBoardDataByJobBoardId(jobBoardId) {
      return this.#jobBoards.find(
        (jobBoard) => jobBoard.jobBoardId === jobBoardId
      );
    }

    static async getContentScriptStatusOfTab(tabId) {
      try {
        return await chrome.tabs.sendMessage(tabId, {
          from: "popup script",
          to: ["content script"],
          body: "send status",
        });
      } catch {
        return {
          hasContentScript: false,
          hasHideNSeekUI: false,
          jobBoardId: "",
        };
      }
    }
  }

  class UnblockAllJobsManager {
    #jobBoardId;
    #logoSrc;
    #logoAlt;

    constructor(jobBoardId) {
      this.#jobBoardId = jobBoardId;
      const { logoAlt, logoSrc } = JobBoards.getJobBoardDataByJobBoardId(
        this.#jobBoardId
      );
      this.#logoSrc = logoSrc;
      this.#logoAlt = logoAlt;
    }

    #jobBoardName = document.querySelector(
      ".options-for-job-board .job-board-name"
    );
    #unhideAllJobsButton = document.querySelector("#unhide-all-jobs");
    #undoUnhideAllJobsButton = document.querySelector("#undo-unhide-all-jobs");

    start(storage) {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const syncIdIsTheOnlyChange =
          Object.hasOwn(storageChanges, "syncId") &&
          Object.keys(storageChanges).length === 1;
        if (syncIdIsTheOnlyChange) return;
        this.#updateElementsBasedOnStorage();
      });
      this.#unhideAllJobsButton.addEventListener("click", () =>
        this.#unblock()
      );
      this.#undoUnhideAllJobsButton.addEventListener("click", () =>
        this.#undoUnblock()
      );
      this.#updateElementsBasedOnStorage(storage);
      this.#jobBoardName.setAttribute("src", this.#logoSrc);
      this.#jobBoardName.setAttribute("alt", this.#logoAlt);
    }

    async #updateElementsBasedOnStorage(providedStorage) {
      const storage = providedStorage || (await chrome.storage.local.get());
      const [
        blockedJobAttributeValuesFromStorage,
        blockedJobAttributeValuesBackupFromStorage,
      ] = await Promise.all([
        this.#getBlockedJobAttributeValuesFromStorage(storage),
        this.#getBlockedJobAttributeValuesBackupFromStorage(storage),
      ]);

      const allBlockedJobAttributeValuesFromStorageAreEmpty = Object.values(
        blockedJobAttributeValuesFromStorage
      ).every((blockedJobAttributeValues) => !blockedJobAttributeValues.length);

      const allBlockedJobAttributeValuesBackupFromStorageAreEmpty =
        Object.values(blockedJobAttributeValuesBackupFromStorage).every(
          (blockedJobAttributeValues) => !blockedJobAttributeValues.length
        );

      if (
        !allBlockedJobAttributeValuesFromStorageAreEmpty &&
        allBlockedJobAttributeValuesBackupFromStorageAreEmpty
      ) {
        this.#unhideAllJobsButton.disabled = false;
        this.#undoUnhideAllJobsButton.disabled = true;
      } else if (
        allBlockedJobAttributeValuesFromStorageAreEmpty &&
        !allBlockedJobAttributeValuesBackupFromStorageAreEmpty
      ) {
        this.#unhideAllJobsButton.disabled = true;
        this.#undoUnhideAllJobsButton.disabled = false;
      } else if (
        allBlockedJobAttributeValuesFromStorageAreEmpty &&
        allBlockedJobAttributeValuesBackupFromStorageAreEmpty
      ) {
        this.#unhideAllJobsButton.disabled = true;
        this.#undoUnhideAllJobsButton.disabled = true;
      }
    }

    async #unblock() {
      this.#unhideAllJobsButton.disabled = true;

      const blockedJobAttributeValuesFromStorage =
        await this.#getBlockedJobAttributeValuesFromStorage();

      const entries = Object.entries(blockedJobAttributeValuesFromStorage);

      if (!entries.length) return;

      const storageChangesToSet = Object.fromEntries([
        ...entries.map(([key]) => [key, []]),
        ...entries.map(([key, value]) => [`${key}.backup`, value]),
      ]);

      chrome.storage.local.set(storageChangesToSet);
    }

    async #undoUnblock() {
      this.#undoUnhideAllJobsButton.disabled = true;

      const blockedJobAttributeValuesBackupFromStorage =
        await this.#getBlockedJobAttributeValuesBackupFromStorage();

      const entries = Object.entries(
        blockedJobAttributeValuesBackupFromStorage
      );

      if (!entries.length) return;

      const storageChangesToSet = Object.fromEntries([
        ...entries.map(([key]) => [key, []]),
        ...entries.map(([key, value]) => [key.replace(".backup", ""), value]),
      ]);

      chrome.storage.local.set(storageChangesToSet);
    }

    async #getBlockedJobAttributeValuesFromStorage(storage) {
      return Object.fromEntries(
        Object.entries(storage || (await chrome.storage.local.get())).filter(
          ([key]) =>
            key.includes(this.#jobBoardId) &&
            key.includes("blockedJobAttributeValues") &&
            !key.endsWith(".backup")
        )
      );
    }

    async #getBlockedJobAttributeValuesBackupFromStorage(storage) {
      return Object.fromEntries(
        Object.entries(storage || (await chrome.storage.local.get())).filter(
          ([key]) =>
            key.includes(this.#jobBoardId) &&
            key.includes("blockedJobAttributeValues.backup")
        )
      );
    }
  }

  class RemoveHiddenJobsManager {
    #removeHiddenJobsStorageKey;

    constructor(jobBoardId) {
      this.#removeHiddenJobsStorageKey = `JobDisplayManager.${jobBoardId}.removeHiddenJobs`;
    }

    #checkboxInput = document.querySelector("input[name='remove-hidden-jobs']");
    #checkboxLabel = this.#checkboxInput.closest("label");

    async start(storage) {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const containsChangesToRemoveHiddenJobs = Object.hasOwn(
          storageChanges,
          this.#removeHiddenJobsStorageKey
        );

        if (!containsChangesToRemoveHiddenJobs) return;

        this.#checkboxInput.checked =
          storageChanges[this.#removeHiddenJobsStorageKey].newValue;
        this.#checkboxLabel.dataset.checked = this.#checkboxInput.checked;
      });

      this.#checkboxInput.addEventListener("input", () => {
        this.#checkboxLabel.dataset.checked = this.#checkboxInput.checked;
        chrome.storage.local.set({
          [this.#removeHiddenJobsStorageKey]: this.#checkboxInput.checked,
        });
      });

      this.#checkboxInput.addEventListener("keydown", (keyboardEvent) => {
        if (keyboardEvent.key !== "Enter" || keyboardEvent.repeat) return;

        this.#checkboxInput.checked = this.#checkboxInput.checked
          ? false
          : true;

        this.#checkboxInput.dispatchEvent(new Event("input"));
      });

      const removeHiddenJobsStorageKeyFound = Object.hasOwn(
        storage,
        this.#removeHiddenJobsStorageKey
      );

      const initialRemoveHiddenJobsValue = removeHiddenJobsStorageKeyFound
        ? storage[this.#removeHiddenJobsStorageKey]
        : false;

      this.#checkboxInput.checked = initialRemoveHiddenJobsValue;
      this.#checkboxLabel.dataset.checked = initialRemoveHiddenJobsValue;
    }
  }

  class HiddenJobsListManager {
    #jobBoardId;
    #jobAttributes;
    #hiddenJobAttributeValuesContainer =
      document.querySelector(".hidden-jobs-list");
    #jobAttributeValueSelector = ".hidden-job-container";
    #hiddenJobsMessageElement = document.querySelector(
      ".nothing-hidden-message"
    );

    constructor(jobBoardId) {
      this.#jobBoardId = jobBoardId;
      const { jobAttributes } = JobBoards.getJobBoardDataByJobBoardId(
        this.#jobBoardId
      );
      this.#jobAttributes = jobAttributes;
    }

    start(storage) {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const changesIncludesBlockedJobAttributeValues = Object.keys(
          storageChanges
        ).some(
          (key) =>
            key.includes("blockedJobAttributeValues") &&
            !key.endsWith(".backup")
        );

        if (changesIncludesBlockedJobAttributeValues)
          this.#updateHiddenJobsPopupList();
      });

      this.#updateHiddenJobsPopupList(storage);

      return this;
    }

    #getHiddenJobAttributeValuesFromStorage(jobAttribute, storage) {
      return Object.entries(storage)
        .filter(
          ([key]) =>
            key.includes(this.#jobBoardId) &&
            key.includes(jobAttribute) &&
            key.includes("blockedJobAttributeValues") &&
            !key.endsWith(".backup")
        )
        .flatMap(([, value]) => value);
    }

    #getHiddenJobAttributeValueElementsInPopupList() {
      return Array.from(
        document.querySelectorAll(this.#jobAttributeValueSelector)
      );
    }

    #getElementTextContentForJobAttribute(jobAttribute, elements) {
      return elements
        .filter((element) => element.dataset.jobAttribute === jobAttribute)
        .map((element) => this.#getCleanedElementTextContent(element));
    }

    #updatePopupListToReflectStorageForJobAttribute(
      jobAttribute,
      storageValues,
      popupListValues
    ) {
      storageValues.forEach((storageValue) => {
        const valueIsInStorageButNotPopupList =
          !popupListValues.includes(storageValue);
        if (valueIsInStorageButNotPopupList)
          this.#addHiddenJobAttributeValueToList(storageValue, jobAttribute);
      });

      popupListValues.forEach((popupListValue) => {
        const valueIsInPopupListButNotStorage =
          !storageValues.includes(popupListValue);
        if (valueIsInPopupListButNotStorage)
          this.#removeHiddenJobAttributeValueFromList(
            popupListValue,
            jobAttribute
          );
      });
    }

    #updateHiddenJobsPopupListForJobAttribute(
      jobAttribute,
      allHiddenJobAttributeValuesFromStorage,
      hiddenJobAttributeValueElementsFromPopupList
    ) {
      const hiddenJobAttributeValuesFromStorage =
        this.#getHiddenJobAttributeValuesFromStorage(
          jobAttribute,
          allHiddenJobAttributeValuesFromStorage
        );

      const hiddenJobAttributeValuesFromPopupList =
        this.#getElementTextContentForJobAttribute(
          jobAttribute,
          hiddenJobAttributeValueElementsFromPopupList
        );

      this.#updatePopupListToReflectStorageForJobAttribute(
        jobAttribute,
        hiddenJobAttributeValuesFromStorage,
        hiddenJobAttributeValuesFromPopupList
      );
    }

    async #updateHiddenJobsPopupList(storage) {
      const blockedJobAttributeValuesFromStorage =
        await this.#getBlockedJobAttributeValuesFromStorage(storage);

      const hiddenJobAttributeValueElementsFromPopupList =
        this.#getHiddenJobAttributeValueElementsInPopupList();

      this.#jobAttributes.forEach((jobAttribute) =>
        this.#updateHiddenJobsPopupListForJobAttribute(
          jobAttribute,
          blockedJobAttributeValuesFromStorage,
          hiddenJobAttributeValueElementsFromPopupList
        )
      );
    }

    async #getBlockedJobAttributeValuesFromStorage(storage) {
      return Object.fromEntries(
        Object.entries(storage || (await chrome.storage.local.get())).filter(
          ([key]) =>
            key.includes(this.#jobBoardId) &&
            key.includes("blockedJobAttributeValues") &&
            !key.endsWith(".backup")
        )
      );
    }

    #getCleanedElementTextContent(element) {
      return element.textContent.replaceAll("\n", "").trim();
    }

    #createElementForHiddenJobAttributeValue(itemName) {
      const hiddenJobContainer = document.createElement("button");
      hiddenJobContainer.classList.add("hidden-job-container");
      const hiddenJobName = document.createElement("div");
      hiddenJobName.classList.add("hidden-job-name");
      hiddenJobName.textContent = itemName;
      const removeIconSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      removeIconSvg.ondragstart = (dragEvent) => dragEvent.preventDefault();
      const removeIconUse = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "use"
      );
      removeIconUse.setAttribute("href", "#remove-icon");
      removeIconSvg.insertAdjacentElement("beforeend", removeIconUse);

      [hiddenJobName, removeIconSvg].forEach((element) =>
        hiddenJobContainer.insertAdjacentElement("beforeend", element)
      );

      return hiddenJobContainer;
    }

    #getPopupListChangeAnimation(change) {
      const expanded = {
        height: "35px",
        marginBottom: "0",
        marginTop: "0",
        opacity: "1",
        paddingBottom: "0.5rem",
        paddingTop: "0.5rem",
      };

      const collapsed = {
        height: "0",
        marginBottom: "0",
        marginTop: "0",
        opacity: "0",
        paddingBottom: "0",
        paddingTop: "0",
      };

      const options = {
        duration: 200,
        easing: "ease-out",
        fill: "forwards",
      };

      return change === "add"
        ? [[collapsed, expanded], options]
        : [[expanded, collapsed], options];
    }

    #getAllArrayItemsLowerCased(array) {
      return array.map((item) => item.toLowerCase());
    }

    async #addHiddenJobAttributeValueToList(
      hiddenJobAttributeValue,
      jobAttribute
    ) {
      const lowerCaseHiddenJobAttributeValue =
        hiddenJobAttributeValue.toLowerCase();

      const hiddenJobAttributeValueElementsInPopupList =
        this.#getHiddenJobAttributeValueElementsInPopupList();

      const hiddenCompanyNamesInPopupList =
        this.#getElementTextContentForJobAttribute(
          "companyName",
          hiddenJobAttributeValueElementsInPopupList
        );

      const lowerCaseHiddenCompanyNamesInPopupList =
        this.#getAllArrayItemsLowerCased(hiddenCompanyNamesInPopupList);

      const companyNameIsInPopupList =
        jobAttribute === "companyName" &&
        lowerCaseHiddenCompanyNamesInPopupList.includes(
          lowerCaseHiddenJobAttributeValue
        );

      if (companyNameIsInPopupList) return;

      const hiddenPromotionalStatusesInPopupList =
        this.#getElementTextContentForJobAttribute(
          "promotionalStatus",
          hiddenJobAttributeValueElementsInPopupList
        );

      const lowerCaseHiddenPromotionalStatusesInPopupList =
        this.#getAllArrayItemsLowerCased(hiddenPromotionalStatusesInPopupList);

      const promotionalStatusIsInPopupList =
        jobAttribute === "promotionalStatus" &&
        lowerCaseHiddenPromotionalStatusesInPopupList.includes(
          lowerCaseHiddenJobAttributeValue
        );

      if (promotionalStatusIsInPopupList) return;

      this.#hiddenJobsMessageElement.dataset.listIsEmpty = false;

      const hiddenJobAttributeValueElement =
        this.#createElementForHiddenJobAttributeValue(hiddenJobAttributeValue);

      hiddenJobAttributeValueElement.setAttribute(
        "title",
        hiddenJobAttributeValue
      );

      Object.assign(hiddenJobAttributeValueElement.dataset, { jobAttribute });

      hiddenJobAttributeValueElement.addEventListener("click", async () => {
        const textContent = this.#getCleanedElementTextContent(
          hiddenJobAttributeValueElement
        );

        const blockedJobAttributeValuesFromStorage =
          await this.#getBlockedJobAttributeValuesFromStorage();

        const entries = Object.entries(blockedJobAttributeValuesFromStorage);

        if (!entries.length) return;

        const storageChangesToSet = Object.fromEntries([
          ...entries.map(([key, value]) => {
            const valueIsNotAnArray = !Array.isArray(value);
            const keyDoesntMatchJobAttribute = !key.includes(jobAttribute);
            if (valueIsNotAnArray || keyDoesntMatchJobAttribute)
              return [key, value];
            return [
              key,
              value.filter((valueItem) => valueItem !== textContent),
            ];
          }),
        ]);

        chrome.storage.local.set(storageChangesToSet);
      });

      const getInsertionData = () => {
        if (jobAttribute === "promotionalStatus")
          return {
            insertionReferenceElement: this.#hiddenJobAttributeValuesContainer,
            insertionPoint: "afterbegin",
          };

        const insertPositionForHiddenCompanyName =
          [
            ...lowerCaseHiddenCompanyNamesInPopupList,
            lowerCaseHiddenJobAttributeValue,
          ]
            .sort()
            .indexOf(lowerCaseHiddenJobAttributeValue) +
          (hiddenPromotionalStatusesInPopupList.length ? 1 : 0);

        const isOnly = lowerCaseHiddenCompanyNamesInPopupList.length === 0;
        const isFirst = insertPositionForHiddenCompanyName === 0;
        const isLast =
          insertPositionForHiddenCompanyName ===
          hiddenJobAttributeValueElementsInPopupList.length;

        const insertionReferenceElement =
          isOnly || isFirst || isLast
            ? this.#hiddenJobAttributeValuesContainer
            : hiddenJobAttributeValueElementsInPopupList[
                insertPositionForHiddenCompanyName
              ];

        const insertionPoint =
          isOnly || isFirst
            ? "afterbegin"
            : isLast
            ? "beforeend"
            : "beforebegin";

        return { insertionReferenceElement, insertionPoint };
      };

      const { insertionReferenceElement, insertionPoint } = getInsertionData();

      insertionReferenceElement.insertAdjacentElement(
        insertionPoint,
        hiddenJobAttributeValueElement
      );

      await hiddenJobAttributeValueElement.animate(
        ...this.#getPopupListChangeAnimation("add")
      ).finished;
    }

    async #removeHiddenJobAttributeValueFromList(
      hiddenJobAttributeValue,
      jobAttribute
    ) {
      const hiddenJobAttributeValueElementsInPopupList =
        this.#getHiddenJobAttributeValueElementsInPopupList();

      if (!hiddenJobAttributeValueElementsInPopupList.length) return;

      const hiddenJobAttributeValuesInPopupList =
        this.#getElementTextContentForJobAttribute(
          jobAttribute,
          hiddenJobAttributeValueElementsInPopupList
        );

      const jobAttributeValueIsNotInPopupList =
        !hiddenJobAttributeValuesInPopupList.includes(hiddenJobAttributeValue);

      if (jobAttributeValueIsNotInPopupList) return;

      const hiddenJobAttributeValueElementToRemove =
        hiddenJobAttributeValueElementsInPopupList.find(
          (element) =>
            element.dataset.jobAttribute === jobAttribute &&
            this.#getCleanedElementTextContent(element) ===
              hiddenJobAttributeValue
        );

      if (!hiddenJobAttributeValueElementToRemove) return;

      await hiddenJobAttributeValueElementToRemove.animate(
        ...this.#getPopupListChangeAnimation("remove")
      ).finished;

      hiddenJobAttributeValueElementToRemove.remove();

      const listIsEmpty = !document.querySelectorAll(
        this.#jobAttributeValueSelector
      ).length;

      if (listIsEmpty)
        this.#hiddenJobsMessageElement.dataset.listIsEmpty = true;
    }
  }

  class JobSearchPopup {
    static #jobBoardSelectorElements = [
      {
        label: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='glassdoor']"
        ),
        input: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='glassdoor'] > input"
        ),
      },
      {
        label: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='indeed']"
        ),
        input: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='indeed'] > input"
        ),
      },
      {
        label: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='linkedIn']"
        ),
        input: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='linkedIn'] > input"
        ),
      },
    ];

    static #recentSearchQueryJobBoardId = "linkedIn";

    static #jobNameSearchContainerInput = document.querySelector(
      ".job-name-search-container > input"
    );

    static #jobNameSearchContainerButton = document.querySelector(
      ".job-name-search-container > button"
    );

    static #jobBoardSearch = {
      glassdoor: {
        defaultOrigin: "https://glassdoor.com",
        originMatchPattern: "https://*.glassdoor.com/*",
        jobBoardName: "Glassdoor",
        getUrl(responseUrl, searchQuery) {
          const encodedSearchQuery = searchQuery.trim().replace(/\s+/g, "-");
          const url = new URL(responseUrl);
          return `${url.origin}/Job/${encodedSearchQuery}-jobs-SRCH_KO0,${encodedSearchQuery.length}.htm`;
        },
      },
      indeed: {
        defaultOrigin: "https://indeed.com",
        originMatchPattern: "https://*.indeed.com/*",
        jobBoardName: "Indeed",
        getUrl(responseUrl, searchQuery) {
          const queryString = new URLSearchParams([
            ["q", searchQuery],
          ]).toString();
          const url = new URL(responseUrl);
          return `${url.origin}/jobs/?${queryString}`;
        },
      },
      linkedIn: {
        defaultOrigin: "https://linkedin.com",
        originMatchPattern: "https://*.linkedin.com/*",
        jobBoardName: "LinkedIn",
        getUrl(responseUrl, searchQuery) {
          const queryString = new URLSearchParams([
            ["keywords", searchQuery],
          ]).toString();
          const url = new URL(responseUrl);
          return `${url.origin}/jobs/search/?${queryString}`;
        },
      },
    };

    static #updateSelectedJobBoard() {
      this.#jobBoardSelectorElements.forEach(({ label, input }) => {
        label.dataset.checked = input.checked;
        if (!input.checked) return;
        this.#recentSearchQueryJobBoardId = label.dataset.jobBoardId;
        chrome.storage.local.set({
          recentSearchQueryJobBoardId: label.dataset.jobBoardId,
        });
        if (!navigator.onLine) return;
        this.#jobNameSearchContainerInput.placeholder = `Search ${label.dataset.jobBoardPlaceholderName}`;
        this.#jobNameSearchContainerInput.focus();
      });
    }

    static #updateSearchButton() {
      this.#jobNameSearchContainerButton.disabled =
        this.#jobNameSearchContainerInput.value.trim() ? false : true;
    }

    static #savedUserInput = "";
    static #disableInputs(textInputPlaceholder = "") {
      this.#jobBoardSelectorElements.forEach(
        ({ input }) => (input.disabled = true)
      );
      this.#jobNameSearchContainerInput.disabled = true;
      this.#jobNameSearchContainerButton.disabled = true;
      this.#jobNameSearchContainerInput.placeholder = textInputPlaceholder;
      this.#savedUserInput = this.#jobNameSearchContainerInput.value;
      this.#jobNameSearchContainerInput.value = "";
    }

    static #enableInputs(textInputValue = this.#savedUserInput) {
      this.#jobBoardSelectorElements.forEach(
        ({ input }) => (input.disabled = false)
      );
      this.#jobNameSearchContainerInput.value = textInputValue;
      this.#jobNameSearchContainerInput.disabled = false;
      this.#updateSearchButton();
      this.#updateSelectedJobBoard();
    }

    static #updateInputsBasedOnConnectivity() {
      if (navigator.onLine) {
        this.#enableInputs();
      } else if (!navigator.onLine) {
        this.#disableInputs("Device is offline");
      }
    }

    static async flashError(errorMessage) {
      this.#jobNameSearchContainerInput.placeholder = errorMessage;

      const keyframes = [
        {
          backgroundColor: "hsl(0, 0%, 100%, 0.3)",
        },
        {
          backgroundColor: "hsl(0, 100%, 85%, 0.9)",
        },
      ];

      const options = {
        direction: "alternate",
        duration: 200,
        easing: "linear",
        iterations: 24,
      };

      await this.#jobNameSearchContainerInput.animate(keyframes, options)
        .finished;

      return this.#updateInputsBasedOnConnectivity();
    }

    static async #search(activeTabInCurrentWindow) {
      if (this.#jobNameSearchContainerButton.disabled) return;

      const searchQuery = this.#jobNameSearchContainerInput.value;

      const { defaultOrigin, originMatchPattern, jobBoardName, getUrl } =
        this.#jobBoardSearch[this.#recentSearchQueryJobBoardId];

      const hasPermission = await chrome.permissions.contains({
        origins: [originMatchPattern],
      });

      if (!hasPermission) {
        this.#disableInputs("Requesting permission...");
        try {
          const permissionGranted = await chrome.permissions.request({
            origins: [originMatchPattern],
          });
          if (!permissionGranted) return this.flashError("Permission required");
        } catch {
          return this.flashError("Permission required");
        }
      }

      this.#disableInputs("Searching...");

      const jobBoardResponse = await Utilities.safeAwait(fetch, defaultOrigin);

      if (!jobBoardResponse || !jobBoardResponse.ok) {
        return this.flashError(`Can't connect to ${jobBoardName}`);
      }

      const url = getUrl(jobBoardResponse.url, searchQuery);

      try {
        await chrome.tabs.update(activeTabInCurrentWindow.id, { url });
      } catch (error) {
        console.log(error);
        chrome.tabs.create({ url });
      }
    }

    static #started = false;
    static async start(activeTabInCurrentWindow) {
      document.documentElement.setAttribute("data-tab-is-job-board", "false");

      if (this.#started) return this.#updateInputsBasedOnConnectivity();
      this.#started = true;

      this.#jobBoardSelectorElements.forEach(({ input }) =>
        input.addEventListener("input", () => this.#updateSelectedJobBoard())
      );

      this.#jobNameSearchContainerInput.addEventListener("input", () =>
        this.#updateSearchButton()
      );

      this.#jobNameSearchContainerInput.addEventListener(
        "keydown",
        (keyboardEvent) => {
          if (keyboardEvent.key === "Enter" && !keyboardEvent.repeat)
            this.#search(activeTabInCurrentWindow);
        }
      );

      this.#jobNameSearchContainerButton.addEventListener("click", () =>
        this.#search(activeTabInCurrentWindow)
      );

      this.#jobNameSearchContainerInput.focus();

      const storage = await chrome.storage.local.get();

      backupManager.start();

      const storageIncludesRecentSearchQueryJobBoardId = Object.hasOwn(
        storage,
        "recentSearchQueryJobBoardId"
      );

      if (storageIncludesRecentSearchQueryJobBoardId)
        this.#recentSearchQueryJobBoardId = storage.recentSearchQueryJobBoardId;

      this.#jobBoardSelectorElements.forEach(({ label, input }) => {
        if (label.dataset.jobBoardId === this.#recentSearchQueryJobBoardId)
          input.checked = true;
      });

      ["online", "offline"].forEach((eventType) =>
        addEventListener(eventType, () =>
          this.#updateInputsBasedOnConnectivity()
        )
      );

      this.#updateInputsBasedOnConnectivity();

      if (!navigator.onLine) this.#updateSelectedJobBoard();
    }
  }

  class JobBoardPopup {
    static #started = false;
    static async start(jobBoardId) {
      document.documentElement.setAttribute("data-tab-is-job-board", "true");

      if (this.#started) return;
      this.#started = true;

      const storage = await chrome.storage.local.get();
      new UnblockAllJobsManager(jobBoardId).start(storage);
      new RemoveHiddenJobsManager(jobBoardId).start(storage);
      new HiddenJobsListManager(jobBoardId).start(storage);
      backupManager.start();
    }
  }

  const backupManager = {};

  backupManager.start = function () {
    const main = document.querySelector("main");
    const settingsButtons = document.querySelectorAll(
      "#settings-strip > button"
    );
    const settingsToggle = document.querySelector("#settings-toggle");
    settingsToggle.addEventListener("click", () => {
      const withSettings = main.classList.toggle("with-settings");
      settingsButtons.forEach(
        (settingsButton) => (settingsButton.tabIndex = withSettings ? 0 : -1)
      );
    });

    const backupButton = document.querySelector("#backup-button");
    backupButton.addEventListener("click", () => this.backup());

    const restoreButton = document.querySelector("#restore-button");
    restoreButton.addEventListener("click", () =>
      Utilities.initiateUpload(this.restore.bind(this))
    );
  };

  backupManager.backup = async function () {
    const backup = await chrome.storage.local.get();
    const jsonStorage = JSON.stringify(backup, null, 2);
    const base64Storage = btoa(jsonStorage);
    const dataUri = `data:application/json;base64,${base64Storage}`;
    const fileName = `hide-n-seek-backup-${Date.now()}.json`;

    Utilities.initiateDownload(dataUri, fileName);
  };

  backupManager.restore = async function (fileList) {
    try {
      const file = fileList[0];
      const fileText = await file.text();
      const jsonStorage = JSON.parse(fileText);
      chrome.storage.local.set(jsonStorage);
    } catch (error) {
      console.log(error);

      const restoreButton = document.querySelector("#restore-button");

      const keyframes = [
        {
          backgroundColor: "hsl(0, 0%, 0%)",
        },
        {
          backgroundColor: "hsl(0, 100%, 40%)",
        },
      ];

      const options = {
        direction: "alternate",
        duration: 200,
        easing: "linear",
        iterations: 24,
      };

      restoreButton.disabled = true;
      restoreButton.style.setProperty("opacity", "1");
      await restoreButton.animate(keyframes, options).finished;
      restoreButton.style.removeProperty("opacity");
      restoreButton.disabled = false;
    }
  };

  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (!message.to.includes("popup script")) return;

    if (
      message.from === "content script" &&
      (message.body === "hasHideNSeekUI changed" ||
        message.body === "bfcache used")
    ) {
      const activeTabInCurrentWindow =
        await Utilities.getActiveTabInCurrentWindow();

      const messageFromActiveTabInCurrentWindow =
        sender.tab.id === activeTabInCurrentWindow.id &&
        sender.tab.windowId === activeTabInCurrentWindow.windowId;

      if (!messageFromActiveTabInCurrentWindow) return;

      if (message.hasHideNSeekUI === true) {
        JobBoardPopup.start(message.jobBoardId);
      } else if (message.hasHideNSeekUI === false) {
        JobSearchPopup.start(activeTabInCurrentWindow);
      }
    }
  });

  const activeTabInCurrentWindow =
    await Utilities.getActiveTabInCurrentWindow();

  if (!activeTabInCurrentWindow)
    return JobSearchPopup.start(activeTabInCurrentWindow);

  const { hasContentScript, hasHideNSeekUI, jobBoardId } =
    await JobBoards.getContentScriptStatusOfTab(activeTabInCurrentWindow.id);

  if (!hasContentScript || !hasHideNSeekUI)
    return JobSearchPopup.start(activeTabInCurrentWindow);

  JobBoardPopup.start(jobBoardId);
})();
