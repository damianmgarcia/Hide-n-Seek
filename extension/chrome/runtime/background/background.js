import { install } from "../modules/install.js";
import { addMessageListener } from "../modules/messaging.js";
import { updateBadge, updateBadges } from "../modules/tabs.js";
import { getJobBoardByUrl } from "../modules/job-boards.js";
import { syncLocalStorage, syncSyncStorage } from "../modules/storage.js";
import { handlePermissionsChange } from "../modules/permissions.js";

addMessageListener("refresh popup", ({ sender }) => updateBadge(sender.tab));
addMessageListener("get job board", ({ message, sendResponse }) =>
  sendResponse(getJobBoardByUrl(message.data.url)),
);

chrome.runtime.onInstalled.addListener(install);
chrome.storage.local.onChanged.addListener(updateBadges);
chrome.storage.local.onChanged.addListener(syncSyncStorage);
chrome.storage.sync.onChanged.addListener(syncLocalStorage);
chrome.permissions.onAdded.addListener(handlePermissionsChange);
chrome.permissions.onRemoved.addListener(handlePermissionsChange);
