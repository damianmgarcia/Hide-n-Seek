import "./ui/info-box.js";
import { createComponent } from "./ui/ui.js";

const quotaWarningElement = createComponent(
  "info-box",
  "warning",
  "Impressive. You've reached the max number of blocked jobs that can sync across devices. Blocked jobs will no longer sync, but you can back them up to a file."
);

const updateStatus = function (error = "") {
  if (error && !quotaWarningElement.isConnected) {
    document.querySelector("#data-settings").prepend(quotaWarningElement);
  } else if (!error && quotaWarningElement.isConnected) {
    syncManager.quotaWarningElement.remove();
  }
};

const localStorage = await chrome.storage.local.get();
updateStatus(localStorage.syncError);
chrome.storage.local.onChanged.addListener((changes) => {
  if (!changes.syncError) return;
  updateStatus(changes.syncError.newValue);
});
