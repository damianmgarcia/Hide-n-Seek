import { install } from "./modules/install.js";
import { addResponse, respond } from "./modules/messaging.js";
import { updateBadge, updateBadges } from "./modules/tabs.js";
import { sendJobBoard } from "./modules/job-boards.js";
import { updateLocalStorage, updateSyncStorage } from "./modules/storage.js";

addResponse("bfcache used", updateBadge);
addResponse("hasHideNSeekUI changed", updateBadge);
addResponse("new listings", updateBadge);
addResponse("send job board", sendJobBoard);

chrome.runtime.onInstalled.addListener(install);
chrome.runtime.onMessage.addListener(respond);
chrome.storage.local.onChanged.addListener(updateBadges);
chrome.storage.local.onChanged.addListener(updateSyncStorage);
chrome.storage.sync.onChanged.addListener(updateLocalStorage);
