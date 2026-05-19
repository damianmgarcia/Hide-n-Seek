import { jobBoards } from "../../modules/job-boards.js";
import { initialStorage } from "../initial-storage.js";

const displaySettings = [
  {
    storageKey: "removeHiddenJobs",
    checkboxSelector: "[name='remove-hidden-jobs']",
  },
  {
    storageKey: "removeBlockButtons",
    checkboxSelector: "[name='remove-block-buttons']",
  },
];

for (const { storageKey, checkboxSelector } of displaySettings) {
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

  updateCheckbox(initialStorage[storageKey]);
}
