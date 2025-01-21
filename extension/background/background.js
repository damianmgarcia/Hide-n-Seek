import { install } from "./modules/install.js";
import { addResponse, respond } from "../modules/messaging.js";
import { updateBadge, updateBadges } from "../modules/tabs.js";
import { sendJobBoard } from "../modules/job-boards.js";
import { updateLocalStorage, updateSyncStorage } from "./modules/storage.js";

addResponse("bfcache used", ({ sender }) => updateBadge(sender.tab));
addResponse("hasHideNSeekUI changed", ({ sender }) => updateBadge(sender.tab));
addResponse("new listing", ({ sender }) => updateBadge(sender.tab));
addResponse("send job board", sendJobBoard);

chrome.runtime.onInstalled.addListener(install);
chrome.runtime.onMessage.addListener(respond);
chrome.storage.local.onChanged.addListener(updateBadges);
chrome.storage.local.onChanged.addListener(updateSyncStorage);
chrome.storage.sync.onChanged.addListener(updateLocalStorage);
