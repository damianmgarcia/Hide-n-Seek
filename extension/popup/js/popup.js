(async () => {
  class Utilities {
    static async safeAwait(functionToAwait, ...args) {
      try {
        return await functionToAwait(...args);
      } catch (error) {
        console.log(error);
      }
    }
  }

  class JobBoards {
    static #jobBoards = [
      {
        hostname: "linkedin.com",
        jobBoardId: "linkedIn",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/linkedin-logo.svg",
        logoAlt: "The logo for LinkedIn.com",
      },
      {
        hostname: "indeed.com",
        jobBoardId: "indeed",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/indeed-logo.svg",
        logoAlt: "The logo for Indeed.com",
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
      ".options-for-applicable-tabs .job-board-name"
    );
    #optionButton = document.querySelector(".option-button");
    #undoButton = document.querySelector(".undo-button");

    start(storage) {
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const syncIdIsTheOnlyChange =
          Object.hasOwn(storageChanges, "syncId") &&
          Object.keys(storageChanges).length === 1;
        if (syncIdIsTheOnlyChange) return;
        this.#updateElementsBasedOnStorage();
      });
      this.#optionButton.addEventListener("click", () => this.#unblock());
      this.#undoButton.addEventListener("click", () => this.#undoUnblock());
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
        this.#optionButton.disabled = false;
        this.#undoButton.disabled = true;
      } else if (
        allBlockedJobAttributeValuesFromStorageAreEmpty &&
        !allBlockedJobAttributeValuesBackupFromStorageAreEmpty
      ) {
        this.#optionButton.disabled = true;
        this.#undoButton.disabled = false;
      } else if (
        allBlockedJobAttributeValuesFromStorageAreEmpty &&
        allBlockedJobAttributeValuesBackupFromStorageAreEmpty
      ) {
        this.#optionButton.disabled = true;
        this.#undoButton.disabled = true;
      }
    }

    async #unblock() {
      this.#optionButton.disabled = true;

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
      this.#undoButton.disabled = true;

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
    #collapseExpandButtonElement = document.querySelector(
      ".collapse-expand-button"
    );
    #expandedListClassToggleElement = document.querySelector("main");
    #expandedListClassName = "expanded-list";
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

    #hiddenJobAttributeValuesContainerCollapsedClientHeight;
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

      this.#collapseExpandButtonElement.addEventListener("click", () => {
        this.#expandedListClassToggleElement.classList.toggle(
          this.#expandedListClassName
        );

        const listIsNotScrollable = this.#getListIsNotScrollable();
        this.#collapseExpandButtonElement.disabled = listIsNotScrollable;
      });

      const { minHeight, paddingBottom, paddingTop } = getComputedStyle(
        this.#hiddenJobAttributeValuesContainer
      );

      this.#hiddenJobAttributeValuesContainerCollapsedClientHeight =
        Number.parseFloat(minHeight) +
        Number.parseFloat(paddingBottom) +
        Number.parseFloat(paddingTop);

      this.#updateHiddenJobsPopupList(storage);

      return this;
    }

    #getListIsNotScrollable() {
      return (
        this.#hiddenJobAttributeValuesContainer.scrollHeight <=
        this.#hiddenJobAttributeValuesContainerCollapsedClientHeight
      );
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
      const removeIcon = document.createElement("img");
      removeIcon.setAttribute("src", "/images/remove-icon.svg");
      removeIcon.ondragstart = (dragEvent) => dragEvent.preventDefault();

      [hiddenJobName, removeIcon].forEach((element) =>
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

      const listIsNotScrollable = this.#getListIsNotScrollable();
      this.#collapseExpandButtonElement.disabled = listIsNotScrollable;
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

      const listIsNotScrollable = this.#getListIsNotScrollable();

      this.#collapseExpandButtonElement.disabled = listIsNotScrollable;

      if (listIsNotScrollable)
        this.#expandedListClassToggleElement.classList.remove(
          this.#expandedListClassName
        );

      const listIsEmpty = !document.querySelectorAll(
        this.#jobAttributeValueSelector
      ).length;

      if (listIsEmpty)
        this.#hiddenJobsMessageElement.dataset.listIsEmpty = true;
    }
  }

  class InapplicableTabPopup {
    static #jobBoardSelectorElements = [
      {
        label: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='linkedIn']"
        ),
        input: document.querySelector(
          "label.job-board-search-option-container[data-job-board-id='linkedIn'] > input"
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
    ];

    static #recentSearchQueryJobBoardId = "linkedIn";

    static #jobNameSearchContainerInput = document.querySelector(
      ".job-name-search-container > input"
    );

    static #jobNameSearchContainerButton = document.querySelector(
      ".job-name-search-container > button"
    );

    static #jobBoardUrlSearchData = {
      linkedIn: {
        defaultHostname: "https://linkedin.com",
        pathname: "/jobs/search/",
        jobSearchParameterName: "keywords",
        jobBoardName: "LinkedIn",
      },
      indeed: {
        defaultHostname: "https://indeed.com",
        pathname: "/jobs",
        jobSearchParameterName: "q",
        jobBoardName: "Indeed",
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

    static async #search(activeTabInCurrentWindow) {
      if (this.#jobNameSearchContainerButton.disabled) return;

      const jobSearchParameterValue = this.#jobNameSearchContainerInput.value;
      this.#disableInputs("Searching...");

      const {
        defaultHostname,
        pathname,
        jobSearchParameterName,
        jobBoardName,
      } = this.#jobBoardUrlSearchData[this.#recentSearchQueryJobBoardId];

      const jobBoardResponse = await Utilities.safeAwait(
        fetch,
        defaultHostname
      );

      if (!jobBoardResponse || !jobBoardResponse.ok) {
        this.#jobNameSearchContainerInput.placeholder = `Can't connect to ${jobBoardName}`;

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
          iterations: 25,
        };

        await this.#jobNameSearchContainerInput.animate(keyframes, options)
          .finished;

        return this.#updateInputsBasedOnConnectivity();
      }

      const url = new URL(jobBoardResponse.url);
      url.pathname = pathname;
      url.searchParams.set(jobSearchParameterName, jobSearchParameterValue);

      const browserNewTabUrls = {
        chrome: "chrome://newtab/",
        edge: "edge://newtab/",
        firefox: "about:newtab",
      };

      const activeTabInCurrentWindowIsNewTabPage = Object.values(
        browserNewTabUrls
      ).some(
        (browserNewTabUrl) => activeTabInCurrentWindow.url === browserNewTabUrl
      );

      const activeTabInCurrentWindowIsJobBoard =
        JobBoards.getJobBoardIdByHostname(
          new URL(activeTabInCurrentWindow.url).hostname
        );

      activeTabInCurrentWindowIsNewTabPage || activeTabInCurrentWindowIsJobBoard
        ? chrome.tabs.update(activeTabInCurrentWindow.id, { url: url.href })
        : chrome.tabs.create({ url: url.href });
    }

    static #started = false;
    static async start(activeTabInCurrentWindow) {
      htmlDataset.applicableTab = "false";

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

  class ApplicableTabPopup {
    static #started = false;
    static async start(jobBoardId) {
      htmlDataset.applicableTab = "true";

      if (this.#started) return;
      this.#started = true;

      const storage = await chrome.storage.local.get();
      new UnblockAllJobsManager(jobBoardId).start(storage);
      new RemoveHiddenJobsManager(jobBoardId).start(storage);
      new HiddenJobsListManager(jobBoardId).start(storage);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (!message.to.includes("popup script")) return;

    if (
      message.from === "content script" &&
      message.body === "hasHideNSeekUI changed"
    ) {
      const messageFromActiveTabInCurrentWindow =
        sender.tab.id === activeTabInCurrentWindow.id &&
        sender.tab.windowId === activeTabInCurrentWindow.windowId;

      if (!messageFromActiveTabInCurrentWindow) return;

      if (message.hasHideNSeekUI === true) {
        ApplicableTabPopup.start(message.jobBoardId);
      } else if (message.hasHideNSeekUI === false) {
        InapplicableTabPopup.start(activeTabInCurrentWindow);
      }
    }
  });

  const htmlDataset = document.documentElement.dataset;

  const [activeTabInCurrentWindow] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTabInCurrentWindow)
    return InapplicableTabPopup.start(activeTabInCurrentWindow);

  const { hasContentScript, hasHideNSeekUI, jobBoardId } =
    await JobBoards.getContentScriptStatusOfTab(activeTabInCurrentWindow.id);

  if (!hasContentScript || !hasHideNSeekUI)
    return InapplicableTabPopup.start(activeTabInCurrentWindow);

  ApplicableTabPopup.start(jobBoardId);
})();
