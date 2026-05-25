import { getJobBoardTabs, reloadTabs } from "./tabs.js";

const hasOriginPermissions = async (origins) =>
  chrome.permissions.contains({ origins });

const requestOriginPermissions = (origins) =>
  chrome.permissions.request({ origins });

const handlePermissionsChange = async (permissions) => {
  if (!permissions.origins) return;

  const jobBoardTabs = await getJobBoardTabs({
    matchPatterns: permissions.origins,
  });

  return reloadTabs(jobBoardTabs);
};

export {
  hasOriginPermissions,
  requestOriginPermissions,
  handlePermissionsChange,
};
