import { download, upload } from "./files.js";
import { isFirefox } from "./browser.js";

const backup = async function () {
  const data = await chrome.storage.local.get();
  delete data.syncError;
  const jsonStorage = JSON.stringify(data, null, 2);
  const encodedJsonStorage = new TextEncoder().encode(jsonStorage);
  const base64Storage = btoa(
    encodedJsonStorage.reduce(function (data, byte) {
      return data + String.fromCodePoint(byte);
    }, "")
  );
  const dataUri = `data:application/json;base64,${base64Storage}`;
  const fileName = `hide-n-seek-backup-${Date.now()}.json`;

  download(dataUri, fileName);
};

const restore = async function (fileList) {
  try {
    const file = fileList[0];
    const fileText = await file.text();
    const jsonStorage = JSON.parse(fileText);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(jsonStorage);
  } catch (error) {
    console.log(error);

    const keyframes = [
      {
        backgroundColor: "hsl(0, 0%, 0%)",
      },
      {
        backgroundColor: "hsl(0, 100%, 40%)",
      },
    ];

    const options = {
      direction: "alternate",
      duration: 200,
      easing: "linear",
      iterations: 24,
    };

    const restoreButton = document.querySelector("#restore-button");
    restoreButton.disabled = true;
    restoreButton.style.setProperty("opacity", "1");
    await restoreButton.animate(keyframes, options).finished;
    restoreButton.style.removeProperty("opacity");
    restoreButton.disabled = false;
  }
};

if (isFirefox) {
  // Hide backup/restore if Firefox. See https://github.com/damianmgarcia/Hide-n-Seek/issues/40
  document.querySelector("#data-settings").style.display = "none";
}

const settingsContainers = document.querySelectorAll(".main-content > *");
const settingsToggle = document.querySelector("#settings-toggle");
settingsToggle.addEventListener("click", () => {
  settingsContainers.forEach((settingsContainer) =>
    settingsContainer.classList.toggle("invisible")
  );
});

const backupButton = document.querySelector("#backup-button");
backupButton.addEventListener("click", () => backup());

const restoreButton = document.querySelector("#restore-button");
restoreButton.addEventListener("click", () => upload(restore));

const feedCharmButton = document.querySelector(".feed-charm-button");
feedCharmButton.addEventListener("click", () =>
  chrome.tabs.create({ url: "https://buymeacoffee.com/hide.n.seek" })
);
