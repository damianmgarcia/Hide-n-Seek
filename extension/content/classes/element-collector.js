class ElementCollector {
  constructor() {
    this.collection = new Set();
    this.onAdded = new EventDispatcher();
    this.onRemoved = new EventDispatcher();
    this.onEmpty = new EventDispatcher();
    this.onNotEmpty = new EventDispatcher();
  }

  collect(selector) {
    if (this.started) return this.collection;
    this.started = true;

    const add = (element) => {
      if (this.collection.has(element)) return;
      this.collection.add(element);
      this.onAdded.dispatchEvent(element);
      if (this.collection.size === 1) this.onNotEmpty.dispatchEvent();
    };

    const remove = (element) => {
      if (!this.collection.has(element)) return;
      this.collection.delete(element);
      this.onRemoved.dispatchEvent(element);
      if (this.collection.size === 0) this.onEmpty.dispatchEvent();
    };

    const updateCollection = (node, callback) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const closest = node.closest(selector);
      if (closest) callback(closest);

      node.querySelectorAll(selector).forEach(callback);
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
