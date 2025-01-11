import { install } from "../../modules/install.js";
import { respond } from "../../modules/messaging.js";
import { updateBadges } from "../../modules/tabs.js";
import {
  updateLocalStorage,
  updateSyncStorage,
} from "../../modules/storage.js";

chrome.runtime.onInstalled.addListener(install);
chrome.runtime.onMessage.addListener(respond);
chrome.storage.local.onChanged.addListener(updateBadges);
chrome.storage.local.onChanged.addListener(updateSyncStorage);
chrome.storage.sync.onChanged.addListener(updateLocalStorage);
