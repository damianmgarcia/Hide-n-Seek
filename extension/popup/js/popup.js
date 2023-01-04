(async () => {
  class Utilities {
    static addCallBlockingForRepetitiveCallsButAllowLastCall(
      functionToCallBlock,
      minCallFreeTimeRequiredBeforeAllowingNextCall = NaN
    ) {
      let callBlockingTimer;

      const functionWithCallBlockingAdded = (...args) => {
        clearTimeout(callBlockingTimer);
        callBlockingTimer = setTimeout(
          () => functionToCallBlock(...args),
          minCallFreeTimeRequiredBeforeAllowingNextCall
        );
      };

      return functionWithCallBlockingAdded;
    }
  }

  class JobBoard {
    static #jobBoards = [
      {
        name: "linkedIn",
        hostname: "www.linkedin.com",
        logoSrc: "/images/linkedin-logo.svg",
        logoAlt: "The logo for LinkedIn.com",
      },
      {
        name: "indeed",
        hostname: "www.indeed.com",
        logoSrc: "/images/indeed-logo.svg",
        logoAlt: "The logo for Indeed.com",
      },
    ];
    static getJobBoardByHostname(hostname = location.hostname) {
      return this.#jobBoards.find((jobBoard) => jobBoard.hostname === hostname);
    }
  }

  class UnblockAllJobsManager {
    #jobBoard;
    #logoSrc;
    #logoAlt;

    constructor(jobBoard, logoSrc, logoAlt) {
      this.#jobBoard = jobBoard;
      this.#logoSrc = logoSrc;
      this.#logoAlt = logoAlt;
    }

    #jobBoardName = document.querySelector(".job-board-name");
    #optionButton = document.querySelector(".option-button");
    #undoButton = document.querySelector(".undo-button");

    start() {
      this.#updateElementsBasedOnStorage();
      chrome.storage.onChanged.addListener((changes) =>
        this.#updateElementsBasedOnStorage(
          Object.fromEntries(
            Object.entries(changes).map(([key, value]) => [key, value.newValue])
          )
        )
      );
      this.#jobBoardName.setAttribute("src", this.#logoSrc);
      this.#jobBoardName.setAttribute("alt", this.#logoAlt);
      this.#optionButton.addEventListener("click", () => this.#unblock());
      this.#undoButton.addEventListener("click", () => this.#undoUnblock());
    }

    #updateElementsBasedOnStorage =
      Utilities.addCallBlockingForRepetitiveCallsButAllowLastCall(async () => {
        const storage = await chrome.storage.sync.get();
        const [
          blockedJobAttributeValuesFromStorage,
          blockedJobAttributeValuesBackupFromStorage,
        ] = await Promise.all([
          this.#getBlockedJobAttributeValuesFromStorage(storage),
          this.#getBlockedJobAttributeValuesBackupFromStorage(storage),
        ]);

        const allBlockedJobAttributeValuesFromStorageAreEmpty = Object.values(
          blockedJobAttributeValuesFromStorage
        ).every(
          (blockedJobAttributeValues) => !blockedJobAttributeValues.length
        );

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
      }, 33);

    async #unblock() {
      const blockedJobAttributeValuesFromStorage =
        await this.#getBlockedJobAttributeValuesFromStorage();

      await Promise.all(
        Object.keys(blockedJobAttributeValuesFromStorage).map((key) =>
          chrome.storage.sync.remove(key)
        )
      );

      await this.#backupBlockedJobAttributeValues(
        blockedJobAttributeValuesFromStorage
      );
    }

    async #undoUnblock() {
      const blockedJobAttributeValuesBackupFromStorage =
        await this.#getBlockedJobAttributeValuesBackupFromStorage();

      await Promise.all(
        Object.entries(blockedJobAttributeValuesBackupFromStorage).map(
          ([key, value]) =>
            chrome.storage.sync.set({ [key.replace(".backup", "")]: value })
        )
      );

      await this.#clearBlockedJobAttributeValuesBackup(
        blockedJobAttributeValuesBackupFromStorage
      );
    }

    async #getBlockedJobAttributeValuesFromStorage(storage) {
      return Object.fromEntries(
        Object.entries(storage || (await chrome.storage.sync.get())).filter(
          ([key]) =>
            key.includes(this.#jobBoard) &&
            key.includes("blockedJobAttributeValues") &&
            !key.endsWith(".backup")
        )
      );
    }

    async #getBlockedJobAttributeValuesBackupFromStorage(storage) {
      return Object.fromEntries(
        Object.entries(storage || (await chrome.storage.sync.get())).filter(
          ([key]) =>
            key.includes(this.#jobBoard) &&
            key.includes("blockedJobAttributeValues.backup")
        )
      );
    }

    async #backupBlockedJobAttributeValues(
      blockedJobAttributeValuesFromStorage
    ) {
      await Promise.all(
        Object.entries(
          blockedJobAttributeValuesFromStorage ||
            (await this.#getBlockedJobAttributeValuesFromStorage())
        ).map(([key, value]) =>
          chrome.storage.sync.set({ [`${key}.backup`]: value })
        )
      );
    }

    async #clearBlockedJobAttributeValuesBackup(
      blockedJobAttributeValuesBackupFromStorage
    ) {
      await Promise.all(
        Object.keys(
          blockedJobAttributeValuesBackupFromStorage ||
            (await this.#getBlockedJobAttributeValuesBackupFromStorage())
        ).map((key) => chrome.storage.sync.remove(key))
      );
    }
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTab) {
    const hostnameOfTabUrl = activeTab.url?.match(
      /https:\/\/(?<hostname>[\w.]*)\//
    )?.groups?.hostname;
    const jobBoard = JobBoard.getJobBoardByHostname(hostnameOfTabUrl);
    if (jobBoard)
      new UnblockAllJobsManager(
        jobBoard.name,
        jobBoard.logoSrc,
        jobBoard.logoAlt
      ).start();
  }
})();
