import { deChunkStorage } from "./storage.js";
import { updateContentScriptRegistrations } from "./permissions.js";

const install = async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const syncStorage = deChunkStorage(await chrome.storage.sync.get());
    if (Object.keys(syncStorage).length) {
      await chrome.storage.local.set(syncStorage);
    }
  }
  updateContentScriptRegistrations({ reloadAllTabs: true });
  chrome.tabs.create({ url: "status.html" });
};

export { install };
