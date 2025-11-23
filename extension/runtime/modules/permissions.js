import { getJobBoardTabs, jobBoardOrigins } from "./job-boards.js";
import { reloadTabs } from "./tabs.js";

const hasOriginPermissions = async (origins) =>
  chrome.permissions.contains({ origins });

const requestOriginPermissions = (origins) =>
  chrome.permissions.request({ origins });

const updateContentScriptRegistrations = async ({ reloadAllTabs } = {}) => {
  const permittedOrigins = (await chrome.permissions.getAll()).origins;
  const registeredContentScripts = (
    await chrome.scripting.getRegisteredContentScripts({ ids: jobBoardOrigins })
  ).map((registeredContentScript) => registeredContentScript.id);

  const contentScriptsToRegister = permittedOrigins.filter(
    (permittedOrigin) => !registeredContentScripts.includes(permittedOrigin)
  );
  const contentScriptsToUnregister = registeredContentScripts.filter(
    (registeredContentScript) =>
      !permittedOrigins.includes(registeredContentScript)
  );

  const registrationPromises = [];
  if (contentScriptsToRegister.length) {
    registrationPromises.push(
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
    registrationPromises.push(
      chrome.scripting.unregisterContentScripts({
        ids: contentScriptsToUnregister,
      })
    );
  }

  if (!registrationPromises.length && !reloadAllTabs) return;

  await Promise.all(registrationPromises);

  const jobBoardTabs = await getJobBoardTabs(
    reloadAllTabs
      ? {}
      : {
          origins: [
            ...new Set([
              ...contentScriptsToRegister,
              ...contentScriptsToUnregister,
            ]),
          ],
        }
  );
  await reloadTabs(jobBoardTabs);

  try {
    await chrome.runtime.sendMessage({
      request: "refresh popup",
    });
  } catch {}
};

export {
  hasOriginPermissions,
  requestOriginPermissions,
  updateContentScriptRegistrations,
};
