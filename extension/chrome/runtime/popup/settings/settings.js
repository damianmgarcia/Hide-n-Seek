import { isFirefox } from "../../modules/browser.js";
import { backup, restore } from "../../modules/backup.js";
import { animateButton } from "../../modules/animation.js";
import "./display-settings.js";
import "./sync-status.js";

const settingsContainers = document.querySelectorAll(".main-content > *");
const settingsToggle = document.querySelector("#settings-toggle");
settingsToggle.addEventListener("click", () => {
  settingsContainers.forEach((settingsContainer) =>
    settingsContainer.classList.toggle("invisible"),
  );
});

const backupButton = document.querySelector("#backup-button");
backupButton.addEventListener("click", backup);

const restoreButton = document.querySelector("#restore-button");
restoreButton.addEventListener("click", async () => {
  const restored = await restore();
  animateButton(restoreButton, restored ? "success" : "failure");
});

const feedCharmButton = document.querySelector(".feed-charm-button");
feedCharmButton.addEventListener("click", () =>
  chrome.tabs.create({ url: "https://buymeacoffee.com/hide.n.seek" }),
);

document.querySelectorAll("[data-hide-if-firefox]").forEach((element) => {
  if (isFirefox) element.style.display = "none";
});
document.querySelectorAll("[data-hide-if-not-firefox]").forEach((element) => {
  if (!isFirefox) element.style.display = "none";
});
