import { debounce, difference } from "./utilities.js";
import { jobBoards } from "./job-boards.js";

let syncId = "";
let syncError = "";
chrome.storage.local
  .get()
  .then((localStorage) => (syncError = localStorage.syncError));

const initializeStorage = async (storage) => {
  const settings = [
    {
      name: "showReleaseNotesAfterUpdate",
      getInitialValue() {
        return true;
      },
    },
    {
      name: "recentSearchQueryJobBoardId",
      getInitialValue() {
        return "linkedIn";
      },
    },
    {
      name: "removeBlockButtons",
      getInitialValue() {
        return false;
      },
    },
    {
      name: "blockButtonAttribute",
      getInitialValue() {
        return "";
      },
    },
    {
      name: "removeHiddenJobs",
      getInitialValue() {
        for (const jobBoardId of ["glassdoor", "indeed", "linkedIn"]) {
          const legacyKey = `JobDisplayManager.${jobBoardId}.removeHiddenJobs`;
          if (Object.hasOwn(storage, legacyKey) && storage[legacyKey])
            return storage[legacyKey];
        }
        return false;
      },
    },
  ];

  const legacyAttributeIdByNewId = {
    company: "companyName",
    job: "job",
    keyword: "keyword",
    promoted: "promotionalStatus",
  };
  const addJobAttributeSettings = (jobBoard) => {
    for (const attribute of jobBoard.attributes) {
      for (const key of [
        { name: "storageKey", suffix: "" },
        { name: "backupStorageKey", suffix: ".backup" },
      ]) {
        settings.push({
          name: attribute[key.name],
          getInitialValue() {
            const legacyKey = `JobAttributeManager.${jobBoard.id}.${legacyAttributeIdByNewId[attribute.id]}.blockedJobAttributeValues${key.suffix}`;
            return (
              (Object.hasOwn(storage, legacyKey) && storage[legacyKey]) || []
            );
          },
        });
      }
    }
  };
  jobBoards.forEach(addJobAttributeSettings);
  const initializedStorage = {};
  for (const setting of settings) {
    initializedStorage[setting.name] = Object.hasOwn(storage, setting.name)
      ? storage[setting.name]
      : setting.getInitialValue();
  }
  await cleanStorage(settings.map((setting) => setting.name));
  await setSyncStorage(initializedStorage);
  await chrome.storage.local.set(initializedStorage);
};

const chunkStorage = (() => {
  const CHUNK_SIZE = 100;
  const chunk = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };
  return (storage) => {
    const chunkedStorage = {};
    for (const [key, value] of Object.entries(storage)) {
      if (Array.isArray(value) && value.length > CHUNK_SIZE) {
        const chunks = chunk(value, CHUNK_SIZE);
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
})();

const deChunkStorage = (storage) => {
  const deChunkedStorage = {};
  for (const [key, value] of Object.entries(storage)) {
    if (Array.isArray(value)) {
      const chunkMatch = key.match(/^(?<key>[^_]+)(?<chunk>_\d+)?$/);
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

const hasOnlyRemovals = (changes) =>
  Object.values(changes).every(
    (value) =>
      Object.hasOwn(value, "oldValue") && !Object.hasOwn(value, "newValue"),
  );

const onlySyncErrorChanged = (changes) =>
  Object.hasOwn(changes, "syncError") && Object.keys(changes).length === 1;

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

const hasCleanStorageRequest = (changes) =>
  Object.hasOwn(changes, "cleanStorage") &&
  Object.hasOwn(changes.cleanStorage, "newValue");

const cleanStorage = async (allowedKeys, sendSyncCleanCommand = true) => {
  try {
    chrome.storage.local.onChanged.removeListener(syncSyncStorage);
    chrome.storage.sync.onChanged.removeListener(syncLocalStorage);
    if (sendSyncCleanCommand) {
      syncId = crypto.randomUUID();
      await chrome.storage.sync.set({ cleanStorage: allowedKeys, syncId });
    }
    const [localStorage, syncStorage] = await Promise.all([
      chrome.storage.local.get(),
      chrome.storage.sync.get(),
    ]);
    const storageKeys = [
      ...new Set([localStorage, syncStorage].flatMap(Object.keys)),
    ];
    const keysToRemove = difference(storageKeys, allowedKeys);
    await Promise.all([
      chrome.storage.local.remove(keysToRemove),
      chrome.storage.sync.remove(keysToRemove),
    ]);
  } finally {
    chrome.storage.local.onChanged.addListener(syncSyncStorage);
    chrome.storage.sync.onChanged.addListener(syncLocalStorage);
  }
};

const setSyncStorage = async (storage, keysToRemove) => {
  try {
    delete storage.syncError;
    if (keysToRemove) await chrome.storage.sync.remove(keysToRemove);
    await chrome.storage.sync.set(chunkStorage(storage));
    syncError = "";
  } catch (error) {
    syncError = error.message;
  } finally {
    chrome.storage.local.set({ syncError });
  }
};

const syncSyncStorage = debounce(async (changes) => {
  if (onlySyncErrorChanged(changes)) return;
  if (hasOnlySyncIdOrOldSyncId(changes)) return;
  if (hasOnlyRemovals(changes)) return;

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
  const syncKeysToRemove = difference(syncStorageKeys, localStorageKeys);
  const trimmedSyncStorage = Object.fromEntries(
    Object.entries(syncStorage).filter(
      ([key]) => !syncKeysToRemove.includes(key),
    ),
  );
  syncId = crypto.randomUUID();

  const newSyncStorage = {
    ...trimmedSyncStorage,
    ...chunkedLocalStorage,
    syncId,
  };
  await setSyncStorage(newSyncStorage, syncKeysToRemove);
}, 2000);

const syncLocalStorage = async (changes) => {
  if (syncError) return;
  if (hasOnlySyncIdOrOldSyncId(changes)) return;
  if (hasCleanStorageRequest(changes))
    return cleanStorage(changes.cleanStorage.newValue, false);
  if (hasOnlyRemovals(changes)) {
    const syncCleared = !Object.keys(await chrome.storage.sync.get()).length;
    if (syncCleared) {
      const oldSync = Object.fromEntries(
        Object.entries(changes).map(([key, value]) => [key, value["oldValue"]]),
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
  const localKeysToRemove = difference(localStorageKeys, syncStorageKeys);
  const trimmedLocalStorage = Object.fromEntries(
    Object.entries(localStorage).filter(
      ([key]) => !localKeysToRemove.includes(key),
    ),
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
};

const { getBlockedValues, getBackupValues } = (() => {
  const getValues = async (filter, storage) => {
    storage = storage || (await chrome.storage.local.get());
    return Object.fromEntries(Object.entries(storage).filter(filter));
  };

  const isForJobBoardId = (key, jobBoardId) => key.includes(jobBoardId);

  const getBackupValues = (jobBoardId, storage) =>
    getValues(
      ([key]) =>
        isForJobBoardId(key, jobBoardId) && key.endsWith("blocked.backup"),
      storage,
    );

  const getBlockedValues = (jobBoardId, storage) =>
    getValues(
      ([key]) => isForJobBoardId(key, jobBoardId) && key.endsWith("blocked"),
      storage,
    );

  return { getBackupValues, getBlockedValues };
})();

export {
  deChunkStorage,
  getBackupValues,
  getBlockedValues,
  syncLocalStorage,
  syncSyncStorage,
  initializeStorage,
};
