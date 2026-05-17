import { deChunkStorage, initializeStorage } from "./storage.js";
import { matchPatterns } from "./job-boards.js";
import { reloadTabs } from "./tabs.js";

const install = async (details) => {
  const isInstall = details.reason === chrome.runtime.OnInstalledReason.INSTALL;
  const isUpdate = details.reason === chrome.runtime.OnInstalledReason.UPDATE;
  if (!isInstall && !isUpdate) return;

  const syncStorage = deChunkStorage(await chrome.storage.sync.get());
  await initializeStorage(syncStorage);
  await chrome.scripting.registerContentScripts([
    {
      id: "hide-n-seek",
      matches: matchPatterns.listingPages,
      css: ["/content/content.css"],
      js: [
        "/content/classes/event-dispatcher.js",
        "/content/classes/element-collector.js",
        "/content/classes/attribute-blocker.js",
        "/content/modules/ui/ui.js",
        "/content/modules/ui/hns-container.js",
        "/content/modules/ui/hns-block-attribute-toggle.js",
        "/content/modules/attribute-processor.js",
        "/content/modules/job-listings.js",
        "/content/modules/messaging.js",
        "/content/modules/status.js",
        "/content/content.js",
      ],
    },
  ]);
  reloadTabs();

  const showReleaseNotes = (() => {
    const dontShowReleaseNotes =
      syncStorage.showReleaseNotesAfterUpdate === false;
    if (dontShowReleaseNotes) return false;
    if (isInstall) {
      return true;
    } else if (isUpdate) {
      const toVersionParts = (version) => version.split(".").map(Number);
      const [newMajor, newMinor] = toVersionParts(
        chrome.runtime.getManifest().version,
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
