import { jobBoards } from "../../modules/job-boards.js";
import { initialStorage } from "../initial-storage.js";

const generalSettings = [
  {
    storageKey: "removeHiddenJobs",
    selector: "[name='remove-hidden-jobs']",
  },
  {
    storageKey: "removeBlockButtons",
    selector: "[name='remove-block-buttons']",
  },
  {
    storageKey: "blockButtonAttribute",
    selector: "[name='block-button-attribute']",
    options: [
      { text: "Ask", value: "" },
      { text: "Block company", value: "company" },
      { text: "Block job", value: "job" },
    ],
  },
];

for (const { storageKey, selector, options } of generalSettings) {
  const setting = document.querySelector(selector);
  if (setting.matches("input[type='checkbox']")) {
    const label = setting.closest("label");

    setting.addEventListener("input", () => {
      label.setAttribute("data-checked", setting.checked);
      chrome.storage.local.set({ [storageKey]: setting.checked });
    });

    setting.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key !== "Enter" || keyboardEvent.repeat) return;
      setting.checked = setting.checked ? false : true;
      setting.dispatchEvent(new Event("input"));
    });

    const updateSetting = (value = false) => {
      setting.checked = value;
      label.setAttribute("data-checked", value);
    };
    chrome.storage.local.onChanged.addListener((changes) => {
      if (!Object.hasOwn(changes, storageKey)) return;
      updateSetting(changes[storageKey].newValue);
    });

    updateSetting(initialStorage[storageKey]);
  } else if (setting.matches("select")) {
    for (const option of options) {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.text = option.text;
      setting.append(optionElement);
    }
    setting.addEventListener("input", () => {
      chrome.storage.local.set({ [storageKey]: setting.value });
    });

    const updateSetting = (value = setting.options[0]) => {
      setting.value = value;
    };
    chrome.storage.local.onChanged.addListener((changes) => {
      if (!Object.hasOwn(changes, storageKey)) return;
      updateSetting(changes[storageKey].newValue);
    });

    updateSetting(initialStorage[storageKey]);
  }
}
