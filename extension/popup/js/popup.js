(async () => {
  class JobBoards {
    static #jobBoards = [
      {
        hostname: "www.linkedin.com",
        jobBoardId: "linkedIn",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/linkedin-logo.svg",
        logoAlt: "The logo for LinkedIn.com",
      },
      {
        hostname: "www.indeed.com",
        jobBoardId: "indeed",
        jobAttributes: ["companyName", "promotionalStatus"],
        logoSrc: "/images/indeed-logo.svg",
        logoAlt: "The logo for Indeed.com",
      },
    ];

    static getJobBoardIdByHostname(hostname) {
      return this.#jobBoards.find((jobBoard) => jobBoard.hostname === hostname)
        ?.jobBoardId;
    }

    static getJobBoardDataByJobBoardId(jobBoardId) {
      return this.#jobBoards.find(
        (jobBoard) => jobBoard.jobBoardId === jobBoardId
      );
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

    #jobBoardName = document.querySelector(".job-board-name");
    #optionButton = document.querySelector(".option-button");
    #undoButton = document.querySelector(".undo-button");

    start(initialStorage) {
      this.#updateElementsBasedOnStorage(initialStorage);
      chrome.storage.local.onChanged.addListener((storageChanges) => {
        const syncIdIsTheOnlyChange =
          Object.hasOwn(storageChanges, "syncId") &&
          Object.keys(storageChanges).length === 1;
        if (syncIdIsTheOnlyChange) return;
        this.#updateElementsBasedOnStorage();
      });
      this.#jobBoardName.setAttribute("src", this.#logoSrc);
      this.#jobBoardName.setAttribute("alt", this.#logoAlt);
      this.#optionButton.addEventListener("click", () => this.#unblock());
      this.#undoButton.addEventListener("click", () => this.#undoUnblock());
    }

    async #updateElementsBasedOnStorage(initialStorage) {
      const storage = initialStorage || (await chrome.storage.local.get());
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

      await chrome.storage.local.set(storageChangesToSet);

      chrome.runtime.sendMessage({
        text: "update badge",
        jobBoardId: this.#jobBoardId,
      });
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

      await chrome.storage.local.set(storageChangesToSet);

      chrome.runtime.sendMessage({
        text: "update badge",
        jobBoardId: this.#jobBoardId,
      });
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

    async start(initialStorage) {
      const removeHiddenJobsStorageKeyFound = Object.hasOwn(
        initialStorage,
        this.#removeHiddenJobsStorageKey
      );

      const initialRemoveHiddenJobsValue = removeHiddenJobsStorageKeyFound
        ? initialStorage[this.#removeHiddenJobsStorageKey]
        : false;

      if (!removeHiddenJobsStorageKeyFound)
        chrome.storage.local.set({
          [this.#removeHiddenJobsStorageKey]: false,
        });

      this.#checkboxInput.checked = initialRemoveHiddenJobsValue;
      this.#checkboxLabel.dataset.checked = this.#checkboxInput.checked;

      this.#checkboxInput.addEventListener("input", () => {
        this.#checkboxLabel.dataset.checked = this.#checkboxInput.checked;
        chrome.storage.local.set({
          [this.#removeHiddenJobsStorageKey]: this.#checkboxInput.checked,
        });
      });

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
    start(initialStorage) {
      const { minHeight, paddingBottom, paddingTop } = getComputedStyle(
        this.#hiddenJobAttributeValuesContainer
      );

      this.#hiddenJobAttributeValuesContainerCollapsedClientHeight =
        Number.parseFloat(minHeight) +
        Number.parseFloat(paddingBottom) +
        Number.parseFloat(paddingTop);

      this.#collapseExpandButtonElement.addEventListener("click", () => {
        this.#expandedListClassToggleElement.classList.toggle(
          this.#expandedListClassName
        );

        const listIsScrollable = this.#getListIsScrollable();
        this.#collapseExpandButtonElement.dataset.listIsScrollable =
          listIsScrollable;
      });

      this.#updateHiddenJobsPopupList(initialStorage);

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

      return this;
    }

    #getListIsScrollable() {
      return (
        this.#hiddenJobAttributeValuesContainer.scrollHeight >
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
      const hiddenJobContainer = document.createElement("div");
      hiddenJobContainer.classList.add("hidden-job-container");
      const hiddenJobName = document.createElement("div");
      hiddenJobName.classList.add("hidden-job-name");
      hiddenJobName.textContent = itemName;
      const removeIcon = document.createElement("img");
      removeIcon.setAttribute("src", "/images/remove-icon.svg");

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

        await chrome.storage.local.set(storageChangesToSet);

        chrome.runtime.sendMessage({
          text: "update badge",
          jobBoardId: this.#jobBoardId,
        });
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

      const listIsScrollable = this.#getListIsScrollable();
      this.#collapseExpandButtonElement.dataset.listIsScrollable =
        listIsScrollable;
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

      const listIsScrollable = this.#getListIsScrollable();

      this.#collapseExpandButtonElement.dataset.listIsScrollable =
        listIsScrollable;

      if (!listIsScrollable)
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

  const [activeTabInCurrentWindow] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTabInCurrentWindow) return;

  const hostnameOfTabUrl = activeTabInCurrentWindow.url?.match(
    /https:\/\/(?<hostname>[\w.]*)\//
  )?.groups?.hostname;

  const jobBoardId = JobBoards.getJobBoardIdByHostname(hostnameOfTabUrl);

  if (!jobBoardId) return;

  document.querySelector(".options-container").classList.remove("display-none");
  const initialStorage = await chrome.storage.local.get();
  new UnblockAllJobsManager(jobBoardId).start(initialStorage);
  new RemoveHiddenJobsManager(jobBoardId).start(initialStorage);
  new HiddenJobsListManager(jobBoardId).start(initialStorage);
})();
