import { jobBoardIds, getJobBoardById } from "./runtime/modules/job-boards.js";
import {
  hasOriginPermissions,
  requestOriginPermissions,
} from "./runtime/modules/permissions.js";
import { backup, restore } from "./runtime/modules/backup.js";
import { animateButton } from "./runtime/modules/animation.js";

const version = chrome.runtime.getManifest().version;
document
  .querySelectorAll(".version")
  .forEach((element) => (element.textContent = version));

const jobBoards = jobBoardIds.map(getJobBoardById);
const permissionsButtons = document.querySelector(".permissions-buttons");

const backupButton = document.querySelector("#backup-button");
backupButton.addEventListener("click", backup);

const restoreButton = document.querySelector("#restore-button");
restoreButton.addEventListener("click", async () => {
  const restored = await restore();
  animateButton(restoreButton, restored ? "success" : "failure");
});

const disableButton = (button, jobBoard) => {
  button.innerHTML = `✓ Hide n' Seek is enabled on <b>${jobBoard.name}</b>`;
  button.classList.remove("green-button");
  button.disabled = true;
};

jobBoards.forEach((jobBoard) => {
  hasOriginPermissions(jobBoard.origins).then((hasOriginPermissions) => {
    const button = document.createElement("button");
    button.classList.add("text-button");
    if (hasOriginPermissions) {
      disableButton(button, jobBoard);
    } else {
      button.classList.add("green-button");
      button.innerHTML = `Click to enable Hide n' Seek on <b>${jobBoard.name}</b>`;
      button.addEventListener("click", async () => {
        const permissionsGranted = await requestOriginPermissions(
          jobBoard.origins
        );
        if (permissionsGranted) disableButton(button, jobBoard);
      });
    }
    permissionsButtons.append(button);
  });
});
