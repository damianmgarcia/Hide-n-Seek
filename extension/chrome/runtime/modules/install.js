import { deChunkStorage } from "./storage.js";
import { updateContentScriptRegistrations } from "./permissions.js";

const install = async (details) => {
  const isInstall = details.reason === chrome.runtime.OnInstalledReason.INSTALL;
  const isUpdate = details.reason === chrome.runtime.OnInstalledReason.UPDATE;
  if (!isInstall && !isUpdate) return;

  const syncStorage = deChunkStorage(await chrome.storage.sync.get());
  if (isInstall && Object.keys(syncStorage).length)
    await chrome.storage.local.set(syncStorage);

  updateContentScriptRegistrations({ reloadAllTabs: true });

  const showReleaseNotes = (() => {
    const dontShowReleaseNotes =
      syncStorage.showReleaseNotesAfterUpdate === false;
    if (dontShowReleaseNotes) return false;
    if (isInstall) {
      return true;
    } else if (isUpdate) {
      const toVersionParts = (version) => version.split(".").map(Number);
      const [newMajor, newMinor] = toVersionParts(
        chrome.runtime.getManifest().version
      );
      const [oldMajor, oldMinor] = toVersionParts(details.previousVersion);
      const isMajorUpdate = newMajor > oldMajor;
      const isMinorUpdate = newMinor > oldMinor;
      return isMajorUpdate || isMinorUpdate;
    }
  })();
  if (showReleaseNotes) chrome.tabs.create({ url: "status.html" });
  if (!Object.hasOwn(syncStorage, "showReleaseNotesAfterUpdate"))
    chrome.storage.local.set({ showReleaseNotesAfterUpdate: true });
};

export { install };
