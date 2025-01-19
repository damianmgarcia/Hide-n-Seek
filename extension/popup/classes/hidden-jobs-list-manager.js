class HiddenJobsListManager {
  hiddenJobAttributeValuesContainer =
    document.querySelector(".hidden-jobs-list");
  jobAttributeValueSelector = ".hidden-job-container";
  hiddenJobsMessageElement = document.querySelector(".nothing-hidden-message");

  constructor(jobBoard, storage) {
    this.jobBoardId = jobBoard.id;
    this.jobAttributes = jobBoard.attributes.map((attribute) => attribute.id);

    chrome.storage.local.onChanged.addListener((changes) => {
      const changesIncludesBlockedJobAttributeValues = Object.keys(
        changes
      ).some(
        (key) =>
          key.includes("blockedJobAttributeValues") && !key.endsWith(".backup")
      );

      if (changesIncludesBlockedJobAttributeValues)
        this.updateHiddenJobsPopupList();
    });

    this.updateHiddenJobsPopupList(storage);
  }

  #getHiddenJobAttributeValuesFromStorage(jobAttribute, storage) {
    return Object.entries(storage)
      .filter(
        ([key]) =>
          key.includes(this.jobBoardId) &&
          key.includes(jobAttribute) &&
          key.includes("blockedJobAttributeValues") &&
          !key.endsWith(".backup")
      )
      .flatMap(([, value]) => value);
  }

  getHiddenJobAttributeValueElementsInPopupList() {
    return Array.from(
      document.querySelectorAll(
        `${this.jobAttributeValueSelector}:not(.removing)`
      )
    );
  }

  getElementTextContentForJobAttribute(jobAttribute, elements) {
    return elements
      .filter((element) => element.dataset.jobAttribute === jobAttribute)
      .map((element) => element.textContent.trim());
  }

  updatePopupListToReflectStorageForJobAttribute(
    jobAttribute,
    storageValues,
    popupListValues
  ) {
    storageValues.forEach((storageValue) => {
      const valueIsInStorageButNotPopupList =
        !popupListValues.includes(storageValue);
      if (valueIsInStorageButNotPopupList)
        this.addHiddenJobAttributeValueToList(storageValue, jobAttribute);
    });

    popupListValues.forEach((popupListValue) => {
      const valueIsInPopupListButNotStorage =
        !storageValues.includes(popupListValue);
      if (valueIsInPopupListButNotStorage)
        this.removeHiddenJobAttributeValueFromList(
          popupListValue,
          jobAttribute
        );
    });
  }

  updateHiddenJobsPopupListForJobAttribute(
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
      this.getElementTextContentForJobAttribute(
        jobAttribute,
        hiddenJobAttributeValueElementsFromPopupList
      );

    this.updatePopupListToReflectStorageForJobAttribute(
      jobAttribute,
      hiddenJobAttributeValuesFromStorage,
      hiddenJobAttributeValuesFromPopupList
    );
  }

  async updateHiddenJobsPopupList(storage) {
    const blockedJobAttributeValuesFromStorage =
      await this.getBlockedJobAttributeValuesFromStorage(storage);

    const hiddenJobAttributeValueElementsFromPopupList =
      this.getHiddenJobAttributeValueElementsInPopupList();

    this.jobAttributes.forEach((jobAttribute) =>
      this.updateHiddenJobsPopupListForJobAttribute(
        jobAttribute,
        blockedJobAttributeValuesFromStorage,
        hiddenJobAttributeValueElementsFromPopupList
      )
    );
  }

  async getBlockedJobAttributeValuesFromStorage(storage) {
    return Object.fromEntries(
      Object.entries(storage || (await chrome.storage.local.get())).filter(
        ([key]) =>
          key.includes(this.jobBoardId) &&
          key.includes("blockedJobAttributeValues") &&
          !key.endsWith(".backup")
      )
    );
  }

  createElementForHiddenJobAttributeValue(itemName) {
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

  getPopupListChangeAnimation(change) {
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

  getLowerCased(array) {
    return array.map((item) => item.toLowerCase());
  }

  async addHiddenJobAttributeValueToList(
    hiddenJobAttributeValue,
    jobAttribute
  ) {
    const lowerCaseHiddenJobAttributeValue =
      hiddenJobAttributeValue.toLowerCase();

    const hiddenJobAttributeValueElementsInPopupList =
      this.getHiddenJobAttributeValueElementsInPopupList();

    const hiddenCompanyNamesInPopupList =
      this.getElementTextContentForJobAttribute(
        "companyName",
        hiddenJobAttributeValueElementsInPopupList
      );

    const lowerCaseHiddenCompanyNamesInPopupList = this.getLowerCased(
      hiddenCompanyNamesInPopupList
    );

    const companyNameIsInPopupList =
      jobAttribute === "companyName" &&
      lowerCaseHiddenCompanyNamesInPopupList.includes(
        lowerCaseHiddenJobAttributeValue
      );

    if (companyNameIsInPopupList) return;

    const hiddenPromotionalStatusesInPopupList =
      this.getElementTextContentForJobAttribute(
        "promotionalStatus",
        hiddenJobAttributeValueElementsInPopupList
      );

    const lowerCaseHiddenPromotionalStatusesInPopupList = this.getLowerCased(
      hiddenPromotionalStatusesInPopupList
    );

    const promotionalStatusIsInPopupList =
      jobAttribute === "promotionalStatus" &&
      lowerCaseHiddenPromotionalStatusesInPopupList.includes(
        lowerCaseHiddenJobAttributeValue
      );

    if (promotionalStatusIsInPopupList) return;

    this.hiddenJobsMessageElement.dataset.listIsEmpty = false;

    const hiddenJobAttributeValueElement =
      this.createElementForHiddenJobAttributeValue(hiddenJobAttributeValue);

    hiddenJobAttributeValueElement.setAttribute(
      "title",
      hiddenJobAttributeValue
    );

    Object.assign(hiddenJobAttributeValueElement.dataset, { jobAttribute });

    hiddenJobAttributeValueElement.addEventListener("click", async () => {
      const entries = Object.entries(
        await this.getBlockedJobAttributeValuesFromStorage()
      );

      if (!entries.length) return;

      const storageChangesToSet = Object.fromEntries([
        ...entries.map(([key, value]) => {
          const valueIsNotAnArray = !Array.isArray(value);
          const keyDoesntMatchJobAttribute = !key.includes(jobAttribute);
          if (valueIsNotAnArray || keyDoesntMatchJobAttribute)
            return [key, value];
          return [
            key,
            value.filter(
              (valueItem) =>
                valueItem !== hiddenJobAttributeValueElement.textContent.trim()
            ),
          ];
        }),
      ]);

      chrome.storage.local.set(storageChangesToSet);
    });

    const getInsertionData = () => {
      if (jobAttribute === "promotionalStatus")
        return {
          insertionReferenceElement: this.hiddenJobAttributeValuesContainer,
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
          ? this.hiddenJobAttributeValuesContainer
          : hiddenJobAttributeValueElementsInPopupList[
              insertPositionForHiddenCompanyName
            ];

      const insertionPoint =
        isOnly || isFirst ? "afterbegin" : isLast ? "beforeend" : "beforebegin";

      return { insertionReferenceElement, insertionPoint };
    };

    const { insertionReferenceElement, insertionPoint } = getInsertionData();

    insertionReferenceElement.insertAdjacentElement(
      insertionPoint,
      hiddenJobAttributeValueElement
    );

    await hiddenJobAttributeValueElement.animate(
      ...this.getPopupListChangeAnimation("add")
    ).finished;
  }

  async removeHiddenJobAttributeValueFromList(
    hiddenJobAttributeValue,
    jobAttribute
  ) {
    const hiddenJobAttributeValueElementsInPopupList =
      this.getHiddenJobAttributeValueElementsInPopupList();

    if (!hiddenJobAttributeValueElementsInPopupList.length) return;

    const hiddenJobAttributeValuesInPopupList =
      this.getElementTextContentForJobAttribute(
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
          element.textContent.trim() === hiddenJobAttributeValue
      );

    if (!hiddenJobAttributeValueElementToRemove) return;

    hiddenJobAttributeValueElementToRemove.classList.add("removing");
    await hiddenJobAttributeValueElementToRemove.animate(
      ...this.getPopupListChangeAnimation("remove")
    ).finished;

    hiddenJobAttributeValueElementToRemove.remove();

    const listIsEmpty = !document.querySelectorAll(
      this.jobAttributeValueSelector
    ).length;

    if (listIsEmpty) this.hiddenJobsMessageElement.dataset.listIsEmpty = true;
  }
}

export { HiddenJobsListManager };
