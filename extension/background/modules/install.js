import { getJobBoardTabs } from "../../modules/job-boards.js";
import { deChunkStorage } from "./storage.js";

const install = async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const syncStorage = deChunkStorage(await chrome.storage.sync.get());
    if (Object.keys(syncStorage).length) {
      await chrome.storage.local.set(syncStorage);
    }
  }

  const jobBoardTabs = await getJobBoardTabs();
  jobBoardTabs.forEach((jobBoardTab) =>
    chrome.tabs.reload(jobBoardTab.id, {
      bypassCache: true,
    })
  );
};

export { install };
