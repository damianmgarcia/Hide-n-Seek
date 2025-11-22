import { settingsManager } from "../../modules/settings-manager.js";
import { safeAwait } from "../../modules/utilities.js";
import { getJobBoardById } from "../../modules/job-boards.js";
import { hasOriginPermissions } from "../../modules/permissions.js";

class JobSearchPopup {
  static jobBoardSelectorElements = [
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

  static recentSearchQueryJobBoardId = "linkedIn";

  static jobNameSearchContainerInput = document.querySelector(
    ".job-name-search-container > input"
  );

  static jobNameSearchContainerButton = document.querySelector(
    ".job-name-search-container > button"
  );

  static jobBoardSearch = {
    glassdoor: {
      getUrl(responseUrl, searchQuery) {
        const encodedSearchQuery = searchQuery.trim().replace(/\s+/g, "-");
        const url = new URL(responseUrl);
        return `${url.origin}/Job/${encodedSearchQuery}-jobs-SRCH_KO0,${encodedSearchQuery.length}.htm`;
      },
    },
    indeed: {
      getUrl(responseUrl, searchQuery) {
        const queryString = new URLSearchParams([
          ["q", searchQuery],
        ]).toString();
        const url = new URL(responseUrl);
        return `${url.origin}/jobs/?${queryString}`;
      },
    },
    linkedIn: {
      getUrl(responseUrl, searchQuery) {
        const queryString = new URLSearchParams([
          ["keywords", searchQuery],
        ]).toString();
        const url = new URL(responseUrl);
        return `${url.origin}/jobs/search/?${queryString}`;
      },
    },
  };

  static updateSelectedJobBoard() {
    this.jobBoardSelectorElements.forEach(({ label, input }) => {
      label.setAttribute("data-checked", input.checked);
      if (!input.checked) return;
      this.recentSearchQueryJobBoardId =
        label.getAttribute("data-job-board-id");
      chrome.storage.local.set({
        recentSearchQueryJobBoardId: label.getAttribute("data-job-board-id"),
      });
      if (!navigator.onLine) return;
      this.jobNameSearchContainerInput.placeholder = `Search ${label.getAttribute(
        "data-job-board-placeholder-name"
      )}`;
      this.jobNameSearchContainerInput.focus();
    });
  }

  static updateSearchButton() {
    this.jobNameSearchContainerButton.disabled =
      this.jobNameSearchContainerInput.value.trim() ? false : true;
  }

  static savedUserInput = "";
  static disableInputs(textInputPlaceholder = "") {
    this.jobBoardSelectorElements.forEach(
      ({ input }) => (input.disabled = true)
    );
    this.jobNameSearchContainerInput.disabled = true;
    this.jobNameSearchContainerButton.disabled = true;
    this.jobNameSearchContainerInput.placeholder = textInputPlaceholder;
    this.savedUserInput = this.jobNameSearchContainerInput.value;
    this.jobNameSearchContainerInput.value = "";
  }

  static enableInputs(textInputValue = this.savedUserInput) {
    this.jobBoardSelectorElements.forEach(
      ({ input }) => (input.disabled = false)
    );
    this.jobNameSearchContainerInput.value = textInputValue;
    this.jobNameSearchContainerInput.disabled = false;
    this.updateSearchButton();
    this.updateSelectedJobBoard();
  }

  static updateInputsBasedOnConnectivity() {
    if (navigator.onLine) {
      this.enableInputs();
    } else if (!navigator.onLine) {
      this.disableInputs("Device is offline");
    }
  }

  static async flashError(errorMessage) {
    this.jobNameSearchContainerInput.placeholder = errorMessage;

    const keyframes = [
      { backgroundColor: "hsl(0, 0%, 100%, 0.3)" },
      { backgroundColor: "hsl(0, 100%, 85%, 0.9)" },
    ];

    const options = {
      direction: "alternate",
      duration: 200,
      easing: "linear",
      iterations: 24,
    };

    await this.jobNameSearchContainerInput.animate(keyframes, options).finished;

    return this.updateInputsBasedOnConnectivity();
  }

  static async search(activeTabInCurrentWindow) {
    if (this.jobNameSearchContainerButton.disabled) return;

    const searchQuery = this.jobNameSearchContainerInput.value;
    const jobBoard = getJobBoardById(this.recentSearchQueryJobBoardId);
    const originPermissions = await hasOriginPermissions(jobBoard.origins);
    const { getUrl } = this.jobBoardSearch[this.recentSearchQueryJobBoardId];

    if (!originPermissions) {
      this.disableInputs("Requesting permission...");
      chrome.runtime.sendMessage({
        request: "request origin permissions",
        data: { origins: jobBoard.origins },
      });
      return;
    }

    this.disableInputs("Searching...");
    const jobBoardResponse = await safeAwait(
      fetch,
      `https://${jobBoard.domains[0]}`
    );
    if (!jobBoardResponse) {
      return this.flashError(`Can't connect to ${jobBoard.name}`);
    }

    const url = getUrl(jobBoardResponse.url, searchQuery);
    try {
      await chrome.tabs.update(activeTabInCurrentWindow.id, { url });
    } catch (error) {
      console.log(error);
      chrome.tabs.create({ url });
    }
  }

  static started = false;
  static async start(activeTab) {
    if (this.started) return this.updateInputsBasedOnConnectivity();
    this.started = true;

    this.jobBoardSelectorElements.forEach(({ input }) =>
      input.addEventListener("input", () => this.updateSelectedJobBoard())
    );

    this.jobNameSearchContainerInput.addEventListener("input", () =>
      this.updateSearchButton()
    );

    this.jobNameSearchContainerInput.addEventListener(
      "keydown",
      (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" && !keyboardEvent.repeat)
          this.search(activeTab);
      }
    );

    this.jobNameSearchContainerButton.addEventListener("click", () =>
      this.search(activeTab)
    );

    this.jobNameSearchContainerInput.focus();

    const localStorage = await chrome.storage.local.get();

    settingsManager.start();

    const storageIncludesRecentSearchQueryJobBoardId = Object.hasOwn(
      localStorage,
      "recentSearchQueryJobBoardId"
    );
    if (storageIncludesRecentSearchQueryJobBoardId)
      this.recentSearchQueryJobBoardId =
        localStorage.recentSearchQueryJobBoardId;

    this.jobBoardSelectorElements.forEach(({ label, input }) => {
      if (
        label.getAttribute("data-job-board-id") ===
        this.recentSearchQueryJobBoardId
      )
        input.checked = true;
    });

    ["online", "offline"].forEach((eventType) =>
      addEventListener(eventType, () => this.updateInputsBasedOnConnectivity())
    );

    this.updateInputsBasedOnConnectivity();

    if (!navigator.onLine) this.updateSelectedJobBoard();
  }
}

export { JobSearchPopup };
