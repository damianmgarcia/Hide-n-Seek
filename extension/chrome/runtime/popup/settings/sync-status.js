import "../../modules/ui/info-box.js";
import { createComponent } from "../../modules/ui/ui.js";
import { initialStorage } from "../initial-storage.js";

const quotaWarningElement = createComponent(
  "info-box",
  "warning",
  "Impressive. You've reached the max number of blocked jobs that can sync across devices. Blocked jobs will no longer sync, but you can back them up to a file.",
);

const updateStatus = (error = "") => {
  if (error && !quotaWarningElement.isConnected) {
    document
      .querySelector("#data-settings h2")
      .insertAdjacentElement("afterend", quotaWarningElement);
  } else if (!error && quotaWarningElement.isConnected) {
    quotaWarningElement.remove();
  }
};

updateStatus(initialStorage.syncError);
chrome.storage.local.onChanged.addListener((changes) => {
  if (!changes.syncError) return;
  updateStatus(changes.syncError.newValue);
});
