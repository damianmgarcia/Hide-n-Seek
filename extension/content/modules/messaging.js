const messaging = (() => {
  const responsesTo = new Map();

  const addResponse = (responseTo, response) => {
    if (responsesTo.has(responseTo)) {
      responsesTo.get(responseTo).add(response);
    } else {
      responsesTo.set(responseTo, new Set([response]));
    }
  };

  const respond = (message, sender, sendResponse) => {
    const responses = responsesTo.get(message.body);
    if (responses)
      responses.forEach((response) =>
        response({ message, sender, sendResponse })
      );
    return true;
  };

  return { addResponse, respond };
})();
