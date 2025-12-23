import { deChunkStorage } from "./storage.js";
import { updateContentScriptRegistrations } from "./permissions.js";

const install = async (details) => {
  const syncStorage = deChunkStorage(await chrome.storage.sync.get());
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    if (Object.keys(syncStorage).length) {
      await chrome.storage.local.set(syncStorage);
    }
  }
  updateContentScriptRegistrations({ reloadAllTabs: true });
  const showReleaseNotes = syncStorage.showReleaseNotesAfterUpdate ?? true;
  if (showReleaseNotes) chrome.tabs.create({ url: "status.html" });
  if (!Object.hasOwn(syncStorage, "showReleaseNotesAfterUpdate"))
    chrome.storage.local.set({ showReleaseNotesAfterUpdate: true });
};

export { install };
