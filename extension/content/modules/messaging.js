const messaging = (() => {
  const listeners = new Map();

  const addMessageListener = (message, listener) => {
    if (listeners.has(message)) {
      listeners.get(message).add(listener);
    } else {
      listeners.set(message, new Set([listener]));
    }
  };

  const routeMessage = (message, sender, sendResponse) => {
    const responses = listeners.get(message.request);
    if (responses)
      responses.forEach((response) =>
        response({ message, sender, sendResponse })
      );
    return true;
  };

  return { addMessageListener, routeMessage };
})();
