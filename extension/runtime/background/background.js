import { install } from "../modules/install.js";
import { addMessageListener } from "../modules/messaging.js";
import { updateBadge, updateBadges } from "../modules/tabs.js";
import { getJobBoard } from "../modules/job-boards.js";
import { updateLocalStorage, updateSyncStorage } from "../modules/storage.js";

addMessageListener("bfcache used", ({ sender }) => updateBadge(sender.tab));
addMessageListener("hasListings changed", ({ sender }) =>
  updateBadge(sender.tab)
);
addMessageListener("listing added", ({ sender }) => updateBadge(sender.tab));
addMessageListener("get job board", getJobBoard);

chrome.runtime.onInstalled.addListener(install);
chrome.storage.local.onChanged.addListener(updateBadges);
chrome.storage.local.onChanged.addListener(updateSyncStorage);
chrome.storage.sync.onChanged.addListener(updateLocalStorage);
