import { isFirefox } from "../modules/browser.js";
import { getActiveTab, getContentStatus } from "../modules/tabs.js";
import { getJobBoardById } from "../modules/job-boards.js";
import { setJobBoard } from "./modules/job-board.js";
import { JobSearchPopup } from "./classes/job-search-popup.js";
import { JobBoardPopup } from "./classes/job-board-popup.js";

const createHtmlTemplate = function (htmlString) {
  const template = document.createElement("template");
  template.innerHTML = htmlString;
  return template;
};

const infoBoxTemplate = {};
infoBoxTemplate.template = createHtmlTemplate(`
      <div class="info-box">
        <div class="info-box-icon"></div>
        <div class="info-box-message"></div>
      </div>
    `);
infoBoxTemplate.get = function (type, message) {
  const container = this.template.content.firstElementChild.cloneNode(true);
  if (type === "warning") {
    container.classList.add("warning");
    container.querySelector(".info-box-icon").textContent = "!";
  }
  container.querySelector(".info-box-message").textContent = message;
  return container;
};

const browserSyncManager = {};
browserSyncManager.quotaWarningElement = infoBoxTemplate.get(
  "warning",
  "Impressive. You've reached the max number of blocked jobs that can sync across devices. Blocked jobs will no longer sync, but you can back them up to a file."
);
browserSyncManager.start = async function () {
  if (this.listening) return;
  this.listening = true;

  const localStorage = await chrome.storage.local.get();
  this.updateStatus(localStorage.syncError);
  chrome.storage.local.onChanged.addListener((changes) => {
    if (!changes.syncError) return;
    this.updateStatus(changes.syncError.newValue);
  });
};
browserSyncManager.updateStatus = function (error = "") {
  if (error && !this.quotaWarningElement.isConnected) {
    document.querySelector("#data-settings").prepend(this.quotaWarningElement);
  } else if (!error && this.quotaWarningElement.isConnected) {
    browserSyncManager.quotaWarningElement.remove();
  }
};

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (
    message.body === "hasHideNSeekUI changed" ||
    message.body === "bfcache used"
  ) {
    const activeTab = await getActiveTab();

    const senderIsActiveTab =
      sender.tab.id === activeTab.id &&
      sender.tab.windowId === activeTab.windowId;

    if (!senderIsActiveTab) return;

    if (message.hasHideNSeekUI === true) {
      JobBoardPopup.start(message.jobBoard.id);
    } else if (message.hasHideNSeekUI === false) {
      JobSearchPopup.start(activeTab);
    }
  }
});

(async () => {
  browserSyncManager.start();

  // Hide backup/restore if Firefox. See https://github.com/damianmgarcia/Hide-n-Seek/issues/40
  if (isFirefox())
    document.querySelector("#data-settings").style.display = "none";

  const activeTab = await getActiveTab();

  if (!activeTab) return JobSearchPopup.start(activeTab);

  const { hasHideNSeekUI, jobBoard } = await getContentStatus(activeTab);

  if (!hasHideNSeekUI) return JobSearchPopup.start(activeTab);

  JobBoardPopup.start(jobBoard);
})();
