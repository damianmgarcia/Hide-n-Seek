import { chunk, debounce, difference } from "./utilities.js";

const chunkStorage = (() => {
  const CHUNK_SIZE = 100;
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

let syncId = "";
let syncError = "";
chrome.storage.local
  .get()
  .then((localStorage) => (syncError = localStorage.syncError));

const hasOnlyRemovals = (changes) =>
  Object.values(changes).every(
    (value) =>
      Object.hasOwn(value, "oldValue") && !Object.hasOwn(value, "newValue")
  );

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

const updateSyncStorage = debounce(async (changes) => {
  const hasSyncError = Object.hasOwn(changes, "syncError");
  const onlySyncErrorChanged =
    hasSyncError && Object.keys(changes).length === 1;
  if (onlySyncErrorChanged) return;
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

  try {
    await chrome.storage.sync.remove(syncKeysToRemove);
    await chrome.storage.sync.set(chunkStorage(newSyncStorage));
    syncError = "";
  } catch (error) {
    syncError = error.message;
  } finally {
    chrome.storage.local.set({ syncError });
  }
}, 2000);

const updateLocalStorage = async (changes) => {
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
  const localKeysToRemove = difference(localStorageKeys, syncStorageKeys);
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
};

export { deChunkStorage, updateLocalStorage, updateSyncStorage };
