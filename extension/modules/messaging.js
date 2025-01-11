import { updateBadge } from "./tabs.js";
import { getJobBoardByHostname } from "./job-boards.js";

const responsesTo = new Map();

const addResponse = (responseTo, response) => {
  if (responsesTo.has(responseTo)) {
    responsesTo.get(responseTo).add(response);
  } else {
    responsesTo.set(responseTo, new Set([response]));
  }
};

["bfcache used", "hasHideNSeekUI changed", "new listings"].forEach((message) =>
  addResponse(message, ({ sender }) => updateBadge(sender.tab))
);

addResponse("send job board", ({ message, sendResponse }) => {
  sendResponse(getJobBoardByHostname(message.data));
});

const respond = (message, sender, sendResponse) => {
  const responses = responsesTo.get(message.body);
  if (responses)
    responses.forEach((response) =>
      response({ message, sender, sendResponse })
    );
  return true;
};

export { respond };
