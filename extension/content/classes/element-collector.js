class ElementCollector {
  constructor() {
    this.onAdded = new EventDispatcher();
    this.onRemoved = new EventDispatcher();
    this.onEmptied = new EventDispatcher();
    this.onFilled = new EventDispatcher();
  }

  collect(selector) {
    if (this.collection) return this.collection;
    this.collection = new Set();

    const add = (element) => {
      if (this.collection.has(element)) return;
      this.collection.add(element);
      this.onAdded.dispatchEvent(element);
      if (this.collection.size === 1) this.onFilled.dispatchEvent();
    };

    const remove = (element) => {
      if (!this.collection.has(element)) return;
      this.collection.delete(element);
      this.onRemoved.dispatchEvent(element);
      if (this.collection.size === 0) this.onEmptied.dispatchEvent();
    };

    const updateCollection = (root, callback) => {
      if (root.nodeType !== Node.ELEMENT_NODE) return;

      const closest = root.closest(selector);
      if (closest) callback(closest);

      root.querySelectorAll(selector).forEach(callback);
    };

    updateCollection(document.documentElement, add);

    new MutationObserver((mutationRecords) => {
      mutationRecords.forEach((mutationRecord) => {
        mutationRecord.addedNodes.forEach((addedNode) =>
          updateCollection(addedNode, add)
        );

        mutationRecord.removedNodes.forEach((removedNode) =>
          updateCollection(removedNode, remove)
        );
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}
