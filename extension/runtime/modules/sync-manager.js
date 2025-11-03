import "./ui/info-box.js";
import { createComponent } from "./ui/ui.js";

const syncManager = {};

syncManager.quotaWarningElement = createComponent(
  "info-box",
  "warning",
  "Impressive. You've reached the max number of blocked jobs that can sync across devices. Blocked jobs will no longer sync, but you can back them up to a file."
);

syncManager.start = async function () {
  if (this.listening) return;
  this.listening = true;

  const localStorage = await chrome.storage.local.get();
  this.updateStatus(localStorage.syncError);
  chrome.storage.local.onChanged.addListener((changes) => {
    if (!changes.syncError) return;
    this.updateStatus(changes.syncError.newValue);
  });
};

syncManager.updateStatus = function (error = "") {
  if (error && !this.quotaWarningElement.isConnected) {
    document.querySelector("#data-settings").prepend(this.quotaWarningElement);
  } else if (!error && this.quotaWarningElement.isConnected) {
    syncManager.quotaWarningElement.remove();
  }
};

export { syncManager };
