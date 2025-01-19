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

  static async safeAwait(functionToAwait, ...args) {
    try {
      return await functionToAwait(...args);
    } catch (error) {
      console.log(error);
    }
  }
}

const CHUNK_SIZE = 100;
const CHUNK_PATTERN = /^(?<key>[^_]+)(?<chunk>_\d+)?$/;
const chunkArray = function (array, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

const chunkStorage = function (storage) {
  const chunkedStorage = {};
  for (const [key, value] of Object.entries(storage)) {
    if (Array.isArray(value) && value.length > CHUNK_SIZE) {
      const chunks = chunkArray(value);
      for (let i = 0; i < chunks.length; i++) {
        chunkedStorage[`${key}${!i ? "" : `_${i}`}`] = chunks[i];
        chunkedStorage[
          `${
            key.includes(".backup")
              ? key.replace(".backup", "")
              : `${key}.backup`
          }${!i ? "" : `_${i}`}`
        ] = [];
      }
    } else {
      chunkedStorage[key] = value;
    }
  }
  return chunkedStorage;
};

const deChunkStorage = function (storage) {
  const deChunkedStorage = {};
  for (const [key, value] of Object.entries(storage)) {
    if (Array.isArray(value)) {
      const chunkMatch = key.match(CHUNK_PATTERN);
      if (Array.isArray(deChunkedStorage[chunkMatch.groups.key])) {
        deChunkedStorage[chunkMatch.groups.key] = [
          ...deChunkedStorage[chunkMatch.groups.key],
          ...value,
        ];
      } else {
        deChunkedStorage[chunkMatch.groups.key] = value;
      }
    } else {
      deChunkedStorage[key] = value;
    }
  }
  return deChunkedStorage;
};

const setDifference = (setA, setB) => {
  return setA.filter((item) => !setB.includes(item));
};

class JobBoards {
  static #jobBoards = [
    {
      jobBoardUrlMatchPattern: "glassdoor.com",
      jobBoardId: "glassdoor",
      jobBoardName: "Glassdoor",
    },
    {
      jobBoardUrlMatchPattern: "indeed.com",
      jobBoardId: "indeed",
      jobBoardName: "Indeed",
      jobBoardPromotionalStatusValue: "Promoted",
    },
    {
      jobBoardUrlMatchPattern: "linkedin.com",
      jobBoardId: "linkedIn",
      jobBoardName: "LinkedIn",
      jobBoardPromotionalStatusValue: "Promoted",
    },
  ];

  static getJobBoardIdByUrl(url) {
    if (typeof url !== "string") return;
    return this.#jobBoards.find((jobBoard) =>
      url.includes(jobBoard.jobBoardUrlMatchPattern)
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
    const urlMatchPatterns =
      chrome.runtime.getManifest().content_scripts[0].matches;
    const tabs = await chrome.tabs.query({
      url: urlMatchPatterns,
      windowType: "normal",
    });
    return tabs.filter((tab) =>
      jobBoardId
        ? JobBoards.getJobBoardIdByUrl(tab.url) === jobBoardId
        : JobBoards.getJobBoardIdByUrl(tab.url)
    );
  }

  static async getContentScriptStatusOfTab(tab) {
    try {
      return await chrome.tabs.sendMessage(tab.id, {
        from: "background script",
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

const updateBadge = async (jobBoardId, tabs) => {
  const localStorage = await chrome.storage.local.get();

  const { jobBoardName, jobBoardPromotionalStatusValue } =
    JobBoards.getJobBoardDataByJobBoardId(jobBoardId);

  const blockedCompaniesStorageKey = Object.keys(localStorage).find(
    (key) =>
      key.includes(jobBoardId) &&
      key.includes("companyName") &&
      key.includes("blockedJobAttributeValues") &&
      !key.endsWith(".backup")
  );

  const blockedCompaniesCount =
    blockedCompaniesStorageKey &&
    Array.isArray(localStorage[blockedCompaniesStorageKey])
      ? localStorage[blockedCompaniesStorageKey].length
      : 0;

  const promotedJobsStorageKey = Object.keys(localStorage).find(
    (key) =>
      key.includes(jobBoardId) &&
      key.includes("promotionalStatus") &&
      key.includes("blockedJobAttributeValues") &&
      !key.endsWith(".backup")
  );

  const promotedJobsAreBlocked =
    promotedJobsStorageKey &&
    Array.isArray(localStorage[promotedJobsStorageKey]) &&
    localStorage[promotedJobsStorageKey].includes(
      jobBoardPromotionalStatusValue
    )
      ? true
      : false;

  const blockedJobAttributesCount =
    blockedCompaniesCount + promotedJobsAreBlocked;

  tabs.forEach(async (tab) => {
    const contentScriptStatus = await JobBoards.getContentScriptStatusOfTab(
      tab
    );

    const setBadge = (title, badgeText, badgeBackgroundColor) => {
      Utilities.safeAwait(chrome.action.setTitle, title);
      Utilities.safeAwait(chrome.action.setBadgeText, badgeText);
      Utilities.safeAwait(
        chrome.action.setBadgeBackgroundColor,
        badgeBackgroundColor
      );
    };

    if (!contentScriptStatus.hasHideNSeekUI) {
      setBadge(
        {
          tabId: tab.id,
          title: "Hide n' Seek",
        },
        {
          tabId: tab.id,
          text: "",
        },
        {
          tabId: tab.id,
          color: [255, 128, 128, 255],
        }
      );
    } else if (contentScriptStatus.hasHideNSeekUI) {
      setBadge(
        {
          tabId: tab.id,
          title: `Hide n' Seek

${jobBoardName}:
• ${blockedCompaniesCount} ${
            blockedCompaniesCount === 1 ? "company" : "companies"
          } hidden${
            promotedJobsAreBlocked
              ? `
• ${jobBoardPromotionalStatusValue} jobs hidden`
              : ""
          }
`,
        },
        {
          tabId: tab.id,
          text: `${blockedJobAttributesCount}`,
        },
        {
          tabId: tab.id,
          color: [255, 128, 128, 255],
        }
      );
    }
  });
};

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const syncStorage = deChunkStorage(await chrome.storage.sync.get());
    if (Object.keys(syncStorage).length) {
      await chrome.storage.local.set(syncStorage);
    }
  }

  const tabsWithJobBoardId = await JobBoards.getTabsWithJobBoardId();
  tabsWithJobBoardId.forEach((tabWithJobBoardId) =>
    Utilities.safeAwait(chrome.tabs.reload, tabWithJobBoardId.id, {
      bypassCache: true,
    })
  );
});

chrome.storage.local.onChanged.addListener((changes) => {
  JobBoards.getAllJobBoardIds().forEach(async (jobBoardId) => {
    const changesIncludesBlockedJobAttributeValuesForJobBoardId = Object.keys(
      changes
    ).some(
      (key) =>
        key.includes(jobBoardId) &&
        key.includes("blockedJobAttributeValues") &&
        !key.endsWith(".backup")
    );

    if (!changesIncludesBlockedJobAttributeValuesForJobBoardId) return;

    const jobBoardIdTabs = await JobBoards.getTabsWithJobBoardId(jobBoardId);
    updateBadge(jobBoardId, jobBoardIdTabs);
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message.to.includes("background script")) return;

  if (
    message.from === "content script" &&
    (message.body === "hasHideNSeekUI changed" ||
      message.body === "bfcache used")
  ) {
    updateBadge(message.jobBoardId, [sender.tab]);
  }
});

let syncId = "";
let syncError = "";
chrome.storage.local
  .get()
  .then((localStorage) => (syncError = localStorage.syncError));
const updateSyncStorage =
  Utilities.addCallBlockingForRepetitiveCallsButAllowLastCall(async () => {
    const [localStorage, syncStorage] = await Promise.all([
      chrome.storage.local.get(),
      chrome.storage.sync.get(),
    ]);

    for (const value of Object.values(localStorage)) {
      if (Array.isArray(value)) value.sort();
    }

    const chunkedLocalStorage = chunkStorage(localStorage);
    const localStorageKeys = Object.keys(chunkedLocalStorage);
    const syncStorageKeys = Object.keys(syncStorage);
    const syncKeysToRemove = setDifference(syncStorageKeys, localStorageKeys);
    const trimmedSyncStorage = Object.fromEntries(
      Object.entries(syncStorage).filter(
        ([key]) => !syncKeysToRemove.includes(key)
      )
    );
    syncId = crypto.randomUUID();

    const newSyncStorage = {
      ...trimmedSyncStorage,
      ...chunkedLocalStorage,
      syncId,
    };
    delete newSyncStorage.syncError;

    await chrome.storage.sync.remove(syncKeysToRemove);
    try {
      await chrome.storage.sync.set(chunkStorage(newSyncStorage));
      syncError = "";
      chrome.storage.local.set({ syncError });
    } catch (error) {
      syncError = error.message;
      chrome.storage.local.set({ syncError });
    }
  }, 2000);

const hasOnlySyncIdOrOldSyncId = (changes) => {
  const hasSyncId = Object.hasOwn(changes, "syncId");
  const onlySyncIdChanged = hasSyncId && Object.keys(changes).length === 1;
  if (onlySyncIdChanged) return true;

  const hasOldSyncId =
    hasSyncId &&
    Object.hasOwn(changes.syncId, "newValue") &&
    changes.syncId.newValue === syncId;
  if (hasOldSyncId) return true;
  return false;
};

const hasOnlyRemovals = (changes) => {
  return Object.values(changes).every(
    (value) =>
      Object.hasOwn(value, "oldValue") && !Object.hasOwn(value, "newValue")
  );
};

chrome.storage.local.onChanged.addListener((changes) => {
  const hasSyncError = Object.hasOwn(changes, "syncError");
  const onlySyncErrorChanged =
    hasSyncError && Object.keys(changes).length === 1;
  if (onlySyncErrorChanged) return;
  if (hasOnlySyncIdOrOldSyncId(changes)) return;
  if (hasOnlyRemovals(changes)) return;

  updateSyncStorage();
});

chrome.storage.sync.onChanged.addListener(async (changes) => {
  if (syncError) return;
  if (hasOnlySyncIdOrOldSyncId(changes)) return;
  if (hasOnlyRemovals(changes)) {
    const syncCleared = !Object.keys(await chrome.storage.sync.get()).length;
    if (syncCleared) {
      const oldSync = Object.fromEntries(
        Object.entries(changes).map(([key, value]) => [key, value["oldValue"]])
      );
      chrome.storage.sync.set(oldSync);
    }
    return;
  }

  const [localStorage, syncStorage] = await Promise.all([
    chrome.storage.local.get(),
    chrome.storage.sync.get(),
  ]);

  const deChunkedSyncStorage = deChunkStorage(syncStorage);
  const localStorageKeys = Object.keys(localStorage);
  const syncStorageKeys = Object.keys(deChunkedSyncStorage);
  const localKeysToRemove = setDifference(localStorageKeys, syncStorageKeys);
  const trimmedLocalStorage = Object.fromEntries(
    Object.entries(localStorage).filter(
      ([key]) => !localKeysToRemove.includes(key)
    )
  );

  const newLocalStorage = {
    ...trimmedLocalStorage,
    ...deChunkedSyncStorage,
  };

  for (const value of Object.values(newLocalStorage)) {
    if (Array.isArray(value)) value.sort();
  }

  await chrome.storage.local.remove(localKeysToRemove);
  await chrome.storage.local.set(newLocalStorage);
});
