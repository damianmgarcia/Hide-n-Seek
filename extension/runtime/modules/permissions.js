import { getJobBoardTabs, jobBoardOrigins } from "./job-boards.js";

const hasOriginPermissions = async (origins) =>
  chrome.permissions.contains({ origins });

const updateContentScriptRegistrations = async () => {
  const permittedOrigins = (await chrome.permissions.getAll()).origins;
  const registeredContentScripts = (
    await chrome.scripting.getRegisteredContentScripts({
      ids: jobBoardOrigins,
    })
  ).map((registeredContentScript) => registeredContentScript.id);

  const contentScriptsToRegister = permittedOrigins.filter(
    (permittedOrigin) => !registeredContentScripts.includes(permittedOrigin)
  );
  const contentScriptsToUnregister = registeredContentScripts.filter(
    (registeredContentScript) =>
      !permittedOrigins.includes(registeredContentScript)
  );

  const promises = [];
  if (contentScriptsToRegister.length) {
    promises.push(
      chrome.scripting.registerContentScripts(
        contentScriptsToRegister.map((permittedOrigin) => ({
          id: permittedOrigin,
          matches: [permittedOrigin],
          css: ["/content/content.css"],
          js: [
            "/content/classes/event-dispatcher.js",
            "/content/classes/element-collector.js",
            "/content/classes/attribute-blocker.js",
            "/content/modules/ui/ui.js",
            "/content/modules/ui/hns-container.js",
            "/content/modules/ui/hns-block-attribute-toggle.js",
            "/content/modules/attribute-processor.js",
            "/content/modules/job-listings.js",
            "/content/modules/messaging.js",
            "/content/modules/status.js",
            "/content/content.js",
          ],
        }))
      )
    );
  }

  if (contentScriptsToUnregister.length) {
    promises.push(
      chrome.scripting.unregisterContentScripts({
        ids: contentScriptsToUnregister,
      })
    );
  }

  if (!promises.length) return;

  await Promise.all(promises);

  const jobBoardTabs = await getJobBoardTabs({
    origins: [
      ...new Set([...contentScriptsToRegister, ...contentScriptsToUnregister]),
    ],
  });
  await Promise.all(
    jobBoardTabs.map((jobBoardTab) =>
      chrome.tabs.reload(jobBoardTab.id, {
        bypassCache: true,
      })
    )
  );

  try {
    await chrome.runtime.sendMessage({
      request: "refresh popup",
    });
  } catch {}
};

export { hasOriginPermissions, updateContentScriptRegistrations };
