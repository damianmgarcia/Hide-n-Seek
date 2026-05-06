import { jobBoards } from "../../modules/job-boards.js";
import { initialStorage } from "../initial-storage.js";

const displaySettings = [
  {
    storageKey: "setting.global.removeHiddenJobs",
    checkboxSelector: "[name='remove-hidden-jobs']",
    getInitialValue() {
      let initialValue = false;
      for (const jobBoard of jobBoards) {
        const legacyKey = `JobDisplayManager.${jobBoard.id}.removeHiddenJobs`;
        const hasLegacyKey = Object.hasOwn(initialStorage, legacyKey);
        if (!hasLegacyKey) continue;
        chrome.storage.local.remove(legacyKey);
        if (initialValue || !initialStorage[legacyKey]) continue;
        initialValue = initialStorage[legacyKey];
      }
      return initialValue;
    },
  },
  {
    storageKey: "setting.global.removeBlockButtons",
    checkboxSelector: "[name='remove-block-buttons']",
    getInitialValue() {
      return false;
    },
  },
];

for (const displaySetting of displaySettings) {
  const { storageKey, checkboxSelector } = displaySetting;
  const checkbox = document.querySelector(checkboxSelector);
  const label = checkbox.closest("label");

  checkbox.addEventListener("input", () => {
    label.setAttribute("data-checked", checkbox.checked);
    chrome.storage.local.set({ [storageKey]: checkbox.checked });
  });

  checkbox.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key !== "Enter" || keyboardEvent.repeat) return;
    checkbox.checked = checkbox.checked ? false : true;
    checkbox.dispatchEvent(new Event("input"));
  });

  const updateCheckbox = (value = false) => {
    checkbox.checked = value;
    label.setAttribute("data-checked", value);
  };
  chrome.storage.local.onChanged.addListener((changes) => {
    if (!Object.hasOwn(changes, storageKey)) return;
    updateCheckbox(changes[storageKey].newValue);
  });

  if (Object.hasOwn(initialStorage, storageKey)) {
    updateCheckbox(initialStorage[storageKey]);
  } else {
    chrome.storage.local.set({
      [storageKey]: displaySetting.getInitialValue(),
    });
  }
}
