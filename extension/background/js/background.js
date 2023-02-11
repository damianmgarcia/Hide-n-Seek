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

  static getRandomNumber({
    min = NaN,
    max = NaN,
    randomIntegersOnly = false,
  } = {}) {
    const randomNumber = !randomIntegersOnly
      ? Math.random() * (max - min) + min
      : Math.floor(Math.random() * (max - min + 1) + min);
    return randomNumber;
  }

  static getRandomString(
    length,
    { includeUpperCase, includeLowerCase, includeNumber, includeSpecial } = {}
  ) {
    const lengthIsNotAnIntegerOrIsLessThanOne =
      !Number.isInteger(length) || length < 1;
    if (lengthIsNotAnIntegerOrIsLessThanOne)
      throw TypeError("length must be an integer greater than zero");

    const allInclusionOptions = [
      includeUpperCase,
      includeLowerCase,
      includeNumber,
      includeSpecial,
    ];

    const includeNothing =
      allInclusionOptions.every((includeOption) => includeOption === false) ||
      (allInclusionOptions.some(
        (inclusionOption) => inclusionOption === false
      ) &&
        !allInclusionOptions.some(
          (inclusionOption) => inclusionOption === true
        ));

    if (includeNothing)
      throw Error(
        "At least one type of character must be permitted to generate a string"
      );

    const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCase = "abcdefghijklmnopqrstuvwxyz";
    const number = "0123456789";
    const special = `!"#$%&'()*+,-./:;<=>?@[\]^_\`{|}~`;

    const includeAll = allInclusionOptions.every(
      (includeOption) => includeOption === undefined
    );

    const permittedCharacters = includeAll
      ? upperCase + lowerCase + number + special
      : `${includeUpperCase ? upperCase : ""}${
          includeLowerCase ? lowerCase : ""
        }${includeNumber ? number : ""}${includeSpecial ? special : ""}`;

    return Array.from({ length }, () =>
      permittedCharacters.charAt(
        this.getRandomNumber({
          min: 0,
          max: permittedCharacters.length - 1,
          randomIntegersOnly: true,
        })
      )
    ).join("");
  }
}

class JobBoards {
  static #jobBoards = [
    {
      jobBoardUrlMatchPattern: "www.linkedin.com",
      jobBoardId: "linkedIn",
      jobBoardName: "LinkedIn",
      jobBoardPromotionalStatusValue: "Promoted",
    },
    {
      jobBoardUrlMatchPattern: "www.indeed.com",
      jobBoardId: "indeed",
      jobBoardName: "Indeed",
      jobBoardPromotionalStatusValue: "Sponsored",
    },
  ];

  static getJobBoardIdByUrl(url) {
    return this.#jobBoards.find((jobBoard) =>
      url?.includes(jobBoard.jobBoardUrlMatchPattern)
    )?.jobBoardId;
  }

  static getAllJobBoardIds() {
    return this.#jobBoards.map((jobBoard) => jobBoard.jobBoardId);
  }

  static getJobBoardDataByJobBoardId(jobBoardId) {
    return this.#jobBoards.find(
      (jobBoard) => jobBoard.jobBoardId === jobBoardId
    );
  }

  static async getTabsWithJobBoardId(jobBoardId = "") {
    const tabs = await chrome.tabs.query({});
    return tabs.filter((tab) =>
      jobBoardId
        ? JobBoards.getJobBoardIdByUrl(tab.url) === jobBoardId
        : JobBoards.getJobBoardIdByUrl(tab.url)
    );
  }
}

const updateActions = async () => {
  const activeTabs = await chrome.tabs.query({ active: true });

  if (!activeTabs.length) return;

  const currentWindowId = (await chrome.windows.getCurrent()).id;

  const activeTabInCurentWindow = activeTabs.find(
    (activeTab) => activeTab.windowId === currentWindowId
  );

  if (!activeTabInCurentWindow) return;

  const jobBoardIdOfActiveTabInCurrentWindow = JobBoards.getJobBoardIdByUrl(
    activeTabInCurentWindow.url
  );

  if (!jobBoardIdOfActiveTabInCurrentWindow) return;

  const activeTabsWithMatchingJobBoardId = activeTabs.filter(
    (activeTab) =>
      JobBoards.getJobBoardIdByUrl(activeTab.url) ===
      jobBoardIdOfActiveTabInCurrentWindow
  );

  updateBadgeTextAndTitle(
    activeTabsWithMatchingJobBoardId,
    jobBoardIdOfActiveTabInCurrentWindow
  );
};

const updateBadgeTextAndTitle = async (tabs, jobBoardId) => {
  const localStorage = await chrome.storage.local.get();

  const { jobBoardName, jobBoardPromotionalStatusValue } =
    JobBoards.getJobBoardDataByJobBoardId(jobBoardId);

  const blockedCompaniesKey = Object.keys(localStorage).find(
    (key) =>
      key.includes(jobBoardId) &&
      key.includes("companyName") &&
      key.includes("blockedJobAttributeValues") &&
      !key.endsWith(".backup")
  );

  const numberOfBlockedCompaniesForJobBoardId =
    blockedCompaniesKey && Array.isArray(localStorage[blockedCompaniesKey])
      ? localStorage[blockedCompaniesKey].length
      : 0;

  const promotedJobsKey = Object.keys(localStorage).find(
    (key) =>
      key.includes(jobBoardId) &&
      key.includes("promotionalStatus") &&
      key.includes("blockedJobAttributeValues") &&
      !key.endsWith(".backup")
  );

  const promotedJobsAreBlockedForJobBoardId =
    promotedJobsKey &&
    Array.isArray(localStorage[promotedJobsKey]) &&
    localStorage[promotedJobsKey].includes(jobBoardPromotionalStatusValue)
      ? true
      : false;

  const numberOfBlockedJobAttributes =
    numberOfBlockedCompaniesForJobBoardId + promotedJobsAreBlockedForJobBoardId;

  tabs.forEach((tab) => {
    chrome.action.setTitle({
      tabId: tab.id,
      title: `Hide n' Seek

${jobBoardName}:
• ${numberOfBlockedCompaniesForJobBoardId} ${
        numberOfBlockedCompaniesForJobBoardId === 1 ? "company" : "companies"
      } hidden${
        promotedJobsAreBlockedForJobBoardId
          ? `\n• ${jobBoardPromotionalStatusValue} jobs hidden`
          : ""
      }
`,
    });

    chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: [255, 128, 128, 255],
    });

    chrome.action.setBadgeText({
      tabId: tab.id,
      text: `${numberOfBlockedJobAttributes}`,
    });
  });
};

chrome.runtime.onInstalled.addListener(async () => {
  const syncStorage = await chrome.storage.sync.get();
  if (Object.keys(syncStorage).length)
    await chrome.storage.local.set(syncStorage);

  const tabsWithJobBoardId = await JobBoards.getTabsWithJobBoardId();

  tabsWithJobBoardId.forEach((tabWithJobBoardId) =>
    chrome.tabs.reload(tabWithJobBoardId.id, { bypassCache: true })
  );
});

[
  chrome.runtime.onInstalled,
  chrome.runtime.onStartup,
  chrome.tabs.onActivated,
].forEach((eventType) => eventType.addListener(() => updateActions()));

chrome.tabs.onUpdated.addListener(async (tabId, tabChanges, tab) => {
  if (tabChanges.status !== "loading") return;

  updateActions();

  if (!tab.url) return;

  const jobBoardId = JobBoards.getJobBoardIdByUrl(tab.url);

  if (!jobBoardId) return;

  chrome.scripting.executeScript({
    target: { tabId },
    files: ["/content-script/js/content-script.js"],
  });
});

chrome.storage.local.onChanged.addListener((storageChanges) => {
  const changesIncludesBlockedJobAttributeValues = Object.keys(
    storageChanges
  ).some(
    (key) =>
      key.includes("blockedJobAttributeValues") && !key.endsWith(".backup")
  );

  if (changesIncludesBlockedJobAttributeValues) updateActions();
});

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.text === "inject css") {
    chrome.scripting.insertCSS({
      target: { tabId: sender.tab.id },
      files: ["/content-script/css/content-script.css"],
    });
  } else if (message.text === "update badge") {
    const { jobBoardId } = message;
    const tabsWithJobBoardId = await JobBoards.getTabsWithJobBoardId(
      jobBoardId
    );
    updateBadgeTextAndTitle(tabsWithJobBoardId, jobBoardId);
  }
});

const getSyncConflictPatch = (storageChanges) => {
  const jobBoardIdSyncConflictData = JobBoards.getAllJobBoardIds().map(
    (jobBoardId) => ({
      blockedJobAttributeValuesKeys: Object.keys(storageChanges).filter(
        (key) =>
          key.includes(jobBoardId) &&
          key.includes("blockedJobAttributeValues") &&
          !key.includes("backup")
      ),

      backupAvailable: Object.entries(storageChanges).some(
        ([key, value]) =>
          key.includes(jobBoardId) &&
          key.includes("blockedJobAttributeValues") &&
          key.includes("backup") &&
          value?.length
      ),
    })
  );

  return Object.fromEntries(
    jobBoardIdSyncConflictData
      .filter(({ backupAvailable }) => backupAvailable)
      .flatMap(({ blockedJobAttributeValuesKeys }) =>
        blockedJobAttributeValuesKeys.map((key) => [key, []])
      )
  );
};

let syncId = "";
const generateSyncId = () => `${Utilities.getRandomString(8)}.${Date.now()}`;

const storageChangesPendingSet = {};
const exportStorageChangesToSyncStorage =
  Utilities.addCallBlockingForRepetitiveCallsButAllowLastCall(async () => {
    const localStorage = await chrome.storage.local.get();

    syncId = generateSyncId();

    const mergedStorageChanges = Object.assign(
      {},
      localStorage,
      storageChangesPendingSet,
      { syncId }
    );

    const syncConflictPatch = getSyncConflictPatch(mergedStorageChanges);

    const patchedStorageChanges = Object.assign(
      mergedStorageChanges,
      syncConflictPatch
    );

    chrome.storage.sync.set(patchedStorageChanges);
    chrome.storage.local.set(patchedStorageChanges);
  }, 2000);

chrome.storage.onChanged.addListener((storageChanges, storageArea) => {
  const syncIdExists = Object.hasOwn(storageChanges, "syncId");

  const syncIdIsTheOnlyChange =
    syncIdExists && Object.keys(storageChanges).length === 1;

  const syncIdIsOld =
    syncIdExists &&
    Object.hasOwn(storageChanges.syncId, "newValue") &&
    storageChanges.syncId.newValue === syncId;

  if (syncIdIsTheOnlyChange || syncIdIsOld) return;

  const syncStorageWasClearedOnAnotherDevice =
    storageArea === "sync" &&
    Object.values(storageChanges).every(
      (value) =>
        Object.hasOwn(value, "oldValue") && !Object.hasOwn(value, "newValue")
    );

  const updateStorageChangesPendingSet = (valueAge) =>
    Object.assign(
      storageChangesPendingSet,
      Object.fromEntries(
        Object.entries(storageChanges).map(([key, value]) => [
          key,
          value[valueAge],
        ])
      )
    );

  !syncStorageWasClearedOnAnotherDevice
    ? updateStorageChangesPendingSet("newValue")
    : updateStorageChangesPendingSet("oldValue");

  exportStorageChangesToSyncStorage();
});
