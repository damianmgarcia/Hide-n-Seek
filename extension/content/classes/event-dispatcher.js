class EventDispatcher {
  constructor() {
    this.listeners = new Set();
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  dispatchEvent(event) {
    this.listeners.forEach((listener) => listener(event));
  }
}
