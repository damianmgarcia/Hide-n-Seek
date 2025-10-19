class HiddenJobsListManager {
  jobAttributeValuesContainer = document.querySelector(".hidden-jobs-list");
  jobAttributeValueSelector = ".hidden-job-button";
  nothingHiddenElement = document.querySelector(".nothing-hidden-message");

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

      if (changesIncludesBlockedJobAttributeValues) this.updateJobsPopupList();
    });

    this.updateJobsPopupList(storage);
  }

  getJobAttributeValuesFromStorage(jobAttribute, storage) {
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

  getJobAttributeValueElementsInPopupList() {
    return Array.from(
      document.querySelectorAll(
        `${this.jobAttributeValueSelector}:not(.removing)`
      )
    );
  }

  getElementJobAttributeValue(jobAttribute, elements) {
    return (
      elements
        .filter(
          (element) =>
            element.getAttribute("data-job-attribute") === jobAttribute
        )
        // .map((element) => element.textContent.trim());
        .map((element) => element.getAttribute("data-job-attribute-value"))
    );
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
        this.addJobAttributeValueToList(storageValue, jobAttribute);
    });

    popupListValues.forEach((popupListValue) => {
      const valueIsInPopupListButNotStorage =
        !storageValues.includes(popupListValue);
      if (valueIsInPopupListButNotStorage)
        this.removeJobAttributeValueFromList(popupListValue, jobAttribute);
    });
  }

  updateJobsPopupListForJobAttribute(
    jobAttribute,
    allJobAttributeValuesFromStorage,
    jobAttributeValueElementsFromPopupList
  ) {
    const jobAttributeValuesFromStorage = this.getJobAttributeValuesFromStorage(
      jobAttribute,
      allJobAttributeValuesFromStorage
    );

    const jobAttributeValuesFromPopupList = this.getElementJobAttributeValue(
      jobAttribute,
      jobAttributeValueElementsFromPopupList
    );

    this.updatePopupListToReflectStorageForJobAttribute(
      jobAttribute,
      jobAttributeValuesFromStorage,
      jobAttributeValuesFromPopupList
    );
  }

  async updateJobsPopupList(storage) {
    const jobAttributeValuesFromStorage =
      await this.getBlockedJobAttributeValuesFromStorage(storage);

    const jobAttributeValueElementsFromPopupList =
      this.getJobAttributeValueElementsInPopupList();

    this.jobAttributes.forEach((jobAttribute) =>
      this.updateJobsPopupListForJobAttribute(
        jobAttribute,
        jobAttributeValuesFromStorage,
        jobAttributeValueElementsFromPopupList
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

  createElementForJobAttributeValue(jobAttribute, jobAttributeValue) {
    const button = document.createElement("button");
    button.classList.add("hidden-job-button");
    button.setAttribute("data-job-attribute", jobAttribute);
    button.setAttribute("data-job-attribute-value", jobAttributeValue);

    const jobAttributeValueElement = document.createElement("div");
    jobAttributeValueElement.classList.add("hidden-job-name");
    jobAttributeValueElement.textContent = jobAttributeValue;
    jobAttributeValueElement.setAttribute("title", jobAttributeValue);

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

    [jobAttributeValueElement, removeIconSvg].forEach((element) =>
      button.insertAdjacentElement("beforeend", element)
    );

    return button;
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

  async addJobAttributeValueToList(jobAttributeValue, jobAttribute) {
    const listElements = this.getJobAttributeValueElementsInPopupList();

    const alreadyInList = listElements.find(
      (listElement) =>
        listElement.getAttribute("data-job-attribute") === jobAttribute &&
        listElement.getAttribute("data-job-attribute-value") ===
          jobAttributeValue
    );
    if (alreadyInList) return;

    this.nothingHiddenElement.removeAttribute("data-list-is-empty");

    const jobAttributeValueElement = this.createElementForJobAttributeValue(
      jobAttribute,
      jobAttributeValue
    );

    jobAttributeValueElement.addEventListener("click", async () => {
      const storageBlockedValues = Object.entries(
        await this.getBlockedJobAttributeValuesFromStorage()
      );

      if (!storageBlockedValues.length) return;

      const storageChangesToSet = Object.fromEntries([
        ...storageBlockedValues.map(([storageKey, blockedValues]) => {
          const valueIsNotAnArray = !Array.isArray(blockedValues);
          const keyDoesntMatchJobAttribute = !storageKey.includes(jobAttribute);
          if (valueIsNotAnArray || keyDoesntMatchJobAttribute) {
            return [storageKey, blockedValues];
          } else {
            return [
              storageKey,
              blockedValues.filter(
                (blockedValue) => blockedValue !== jobAttributeValue
                // blockedValue !== jobAttributeValueElement.textContent.trim()
              ),
            ];
          }
        }),
      ]);

      chrome.storage.local.set(storageChangesToSet);
    });

    const listElementsValues = listElements.map((listElement) =>
      listElement.getAttribute("data-job-attribute-value")
    );
    const insertPosition = listElementsValues.length
      ? [...listElementsValues, jobAttributeValue]
          .sort((a, b) => a.localeCompare(b))
          .indexOf(jobAttributeValue)
      : 0;

    const isOnly = listElementsValues.length === 0;
    const isFirst = insertPosition === 0;
    const isLast = insertPosition === listElements.length;

    const insertionReferenceElement =
      isOnly || isFirst || isLast
        ? this.jobAttributeValuesContainer
        : listElements[insertPosition];

    const insertionPoint =
      isOnly || isFirst ? "afterbegin" : isLast ? "beforeend" : "beforebegin";

    insertionReferenceElement.insertAdjacentElement(
      insertionPoint,
      jobAttributeValueElement
    );

    await jobAttributeValueElement.animate(
      ...this.getPopupListChangeAnimation("add")
    ).finished;
  }

  async removeJobAttributeValueFromList(jobAttributeValue, jobAttribute) {
    const jobAttributeValueElementsInPopupList =
      this.getJobAttributeValueElementsInPopupList();

    if (!jobAttributeValueElementsInPopupList.length) return;

    const jobAttributeValuesInPopupList = this.getElementJobAttributeValue(
      jobAttribute,
      jobAttributeValueElementsInPopupList
    );

    const jobAttributeValueIsNotInPopupList =
      !jobAttributeValuesInPopupList.includes(jobAttributeValue);

    if (jobAttributeValueIsNotInPopupList) return;

    const jobAttributeValueElementToRemove =
      jobAttributeValueElementsInPopupList.find(
        (element) =>
          element.getAttribute("data-job-attribute") === jobAttribute &&
          element.getAttribute("data-job-attribute-value") === jobAttributeValue
        // element.textContent.trim() === jobAttributeValue
      );

    if (!jobAttributeValueElementToRemove) return;

    jobAttributeValueElementToRemove.classList.add("removing");
    await jobAttributeValueElementToRemove.animate(
      ...this.getPopupListChangeAnimation("remove")
    ).finished;

    jobAttributeValueElementToRemove.remove();

    const listIsEmpty = !document.querySelectorAll(
      this.jobAttributeValueSelector
    ).length;

    if (listIsEmpty)
      this.nothingHiddenElement.setAttribute("data-list-is-empty", "");
  }
}

export { HiddenJobsListManager };
