class HiddenJobsListManager {
  jobAttributeValuesContainer = document.querySelector(".hidden-jobs-list");
  jobAttributeValueSelector = ".hidden-job-button";
  nothingHiddenElement = document.querySelector(".nothing-hidden-message");
  addKeywordInput = document.querySelector("input[name='add-keyword']");

  constructor(jobBoard, storage) {
    this.jobBoard = jobBoard;
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

    this.addKeywordInput.addEventListener("keydown", async (keyboardEvent) => {
      if (keyboardEvent.key === "Enter" && !keyboardEvent.repeat) {
        const trimmedValue = this.addKeywordInput.value.trim();
        if (!trimmedValue) return;
        this.addKeywordInput.value = "";
        const storageUpdated = await this.updateStorage(
          "keyword",
          trimmedValue,
          "block"
        );
        if (!storageUpdated) {
          const alreadyAddedElement =
            this.jobAttributeValuesContainer.querySelector(
              `[data-job-attribute="keyword"][data-job-attribute-value="${trimmedValue}"]`
            );
          alreadyAddedElement.scrollIntoView({ block: "center" });
          alreadyAddedElement.animate(
            ...this.getPopupListChangeAnimation("attention")
          );
        }
      }
    });

    this.updateJobsPopupList(storage);
  }

  getJobAttributeValuesFromStorage(jobAttribute, storage) {
    return Object.entries(storage)
      .filter(
        ([key]) =>
          key.includes(this.jobBoard.id) &&
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
    return elements
      .filter(
        (element) => element.getAttribute("data-job-attribute") === jobAttribute
      )
      .map((element) => element.getAttribute("data-job-attribute-value"));
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
          key.includes(this.jobBoard.id) &&
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

    if (change === "add") {
      return [[collapsed, expanded], options];
    } else if (change === "remove") {
      return [[expanded, collapsed], options];
    } else if (change === "attention") {
      return [
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(10.00deg)" },
          { transform: "rotate(0deg)" },
          { transform: "rotate(-7.94deg)" },
          { transform: "rotate(0deg)" },
          { transform: "rotate(6.31deg)" },
          { transform: "rotate(0deg)" },
          { transform: "rotate(-5.01deg)" },
          { transform: "rotate(0deg)" },
          { transform: "rotate(3.98deg)" },
          { transform: "rotate(0deg)" },
        ],
        {
          duration: 400,
          easing: "cubic-bezier(0.5, 0.0, 0.5, 1.0)",
          iterations: 1,
        },
      ];
    }
  }

  async updateStorage(jobAttribute, jobAttributeValue, action) {
    const storageBlockedValues = Object.entries(
      await this.getBlockedJobAttributeValuesFromStorage()
    );

    if (action === "unblock" && !storageBlockedValues.length) {
      return;
    } else if (action === "block") {
      const key = `JobAttributeManager.${this.jobBoard.id}.${jobAttribute}.blockedJobAttributeValues`;
      if (
        !storageBlockedValues.some(
          ([storageBlockedValueKey]) => storageBlockedValueKey === key
        )
      ) {
        storageBlockedValues.push([key, []]);
      }
    }

    let alreadyBlocked;
    let clearBackups;
    const storageChangesToSet = Object.fromEntries([
      ...storageBlockedValues.map(([storageKey, blockedValues]) => {
        const valueIsNotAnArray = !Array.isArray(blockedValues);
        const keyDoesntMatchJobAttribute = !storageKey.includes(jobAttribute);
        if (valueIsNotAnArray || keyDoesntMatchJobAttribute) {
          return [storageKey, blockedValues];
        } else {
          if (action === "unblock") {
            return [
              storageKey,
              blockedValues.filter(
                (blockedValue) => blockedValue !== jobAttributeValue
              ),
            ];
          } else if (action === "block") {
            if (blockedValues.includes(jobAttributeValue)) {
              alreadyBlocked = true;
              return [storageKey, blockedValues];
            } else {
              clearBackups = true;
              return [storageKey, blockedValues.concat(jobAttributeValue)];
            }
          }
        }
      }),
    ]);

    if (clearBackups) {
      Object.keys(storageChangesToSet).forEach(
        (key) => (storageChangesToSet[`${key}.backup`] = [])
      );
    }

    if (action === "block" && alreadyBlocked) {
      return false;
    } else {
      this.scrollIntoView = { jobAttribute, jobAttributeValue };
      return chrome.storage.local.set(storageChangesToSet).then(() => true);
    }
  }

  async addJobAttributeValueToList(jobAttributeValue, jobAttribute) {
    const listElements = this.getJobAttributeValueElementsInPopupList();

    const alreadyInList = listElements.some(
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

    jobAttributeValueElement.addEventListener("click", () =>
      this.updateStorage(jobAttribute, jobAttributeValue, "unblock")
    );

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

    let scrolledIntoView;
    if (
      this.scrollIntoView &&
      this.scrollIntoView.jobAttribute === jobAttribute &&
      this.scrollIntoView.jobAttributeValue === jobAttributeValue
    ) {
      this.scrollIntoView = {};
      scrolledIntoView = true;
      jobAttributeValueElement.scrollIntoView({ block: "center" });
    }

    await jobAttributeValueElement.animate(
      ...this.getPopupListChangeAnimation("add")
    ).finished;

    if (scrolledIntoView) {
      await jobAttributeValueElement.animate(
        ...this.getPopupListChangeAnimation("attention")
      ).finished;
    }
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
