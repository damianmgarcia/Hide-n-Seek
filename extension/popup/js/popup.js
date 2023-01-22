(async () => {
  class JobBoard {
    static #jobBoards = [
      {
        hostname: "www.linkedin.com",
        jobBoardId: "linkedIn",
        logoSrc: "/images/linkedin-logo.svg",
        logoAlt: "The logo for LinkedIn.com",
      },
      {
        hostname: "www.indeed.com",
        jobBoardId: "indeed",
        logoSrc: "/images/indeed-logo.svg",
        logoAlt: "The logo for Indeed.com",
      },
    ];
    static getJobBoardByHostname(hostname = location.hostname) {
      return this.#jobBoards.find((jobBoard) => jobBoard.hostname === hostname);
    }
  }

  class UnblockAllJobsManager {
    #jobBoardId;
    #logoSrc;
    #logoAlt;

    constructor(jobBoardId, logoSrc, logoAlt) {
      this.#jobBoardId = jobBoardId;
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

  const [activeTabInCurrentWindow] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTabInCurrentWindow) return;

  const hostnameOfTabUrl = activeTabInCurrentWindow.url?.match(
    /https:\/\/(?<hostname>[\w.]*)\//
  )?.groups?.hostname;

  const jobBoard = JobBoard.getJobBoardByHostname(hostnameOfTabUrl);

  if (!jobBoard) return;

  document.querySelector(".options-container").classList.remove("display-none");

  const initialStorage = await chrome.storage.local.get();

  new UnblockAllJobsManager(
    jobBoard.jobBoardId,
    jobBoard.logoSrc,
    jobBoard.logoAlt
  ).start(initialStorage);

  new RemoveHiddenJobsManager(jobBoard.jobBoardId).start(initialStorage);
})();
