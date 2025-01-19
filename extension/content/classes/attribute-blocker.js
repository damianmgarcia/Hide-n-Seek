class AttributeBlocker {
  static valueStorageKeys = new Set();

  #changes = new Map();

  constructor(jobBoard, attribute, storage) {
    this.jobBoardId = jobBoard.id;
    this.attributeId = attribute.id;
    this.defaultAttribute = attribute.default;
    this.getValue = createAttributeProcessor(attribute);
    this.storageKey = `JobAttributeManager.${jobBoard.id}.${attribute.id}.blockedJobAttributeValues`;
    this.values = new Set(storage[this.storageKey]);
    AttributeBlocker.valueStorageKeys.add(this.storageKey);
    const storagePropertiesToSet = [
      this.storageKey,
      `${this.storageKey}.backup`,
    ]
      .filter((storageKey) => !Object.hasOwn(storage, storageKey))
      .map((storageKey) => [storageKey, []]);

    if (storagePropertiesToSet.length)
      chrome.storage.local.set(Object.fromEntries(storagePropertiesToSet));

    chrome.storage.local.onChanged.addListener((changes) => {
      const hasChangesToThisJobAttribute = Object.hasOwn(
        changes,
        this.storageKey
      );
      if (!hasChangesToThisJobAttribute) return;

      const valuesFromStorage = new Set(changes[this.storageKey].newValue);

      const mergedChanges = new Map([
        ...[...valuesFromStorage]
          .filter((valueFromStorage) => !this.values.has(valueFromStorage))
          .map((value) => [value, "block"]),
        ...[...this.values]
          .filter((value) => !valuesFromStorage.has(value))
          .map((value) => [value, "unblock"]),
        ...this.#changes,
      ]);

      if (!mergedChanges.size) return;

      mergedChanges.forEach((action, value) =>
        action === "block"
          ? this.blockValue(value, false)
          : this.unblockValue(value, false)
      );
    });
  }

  getToggle(jobListing) {
    const value = this.getValue(jobListing);
    if (!value) return;

    const hnsToggle = ui.createElement(
      "hns-toggle",
      this.attributeId,
      value,
      this.defaultAttribute
    );

    this.updateToggle(hnsToggle, value);

    hnsToggle.addEventListener("click", () => {
      if (this.valueIsBlocked(value)) {
        this.unblockValue(value);
      } else {
        this.blockValue(value);
      }
    });

    return hnsToggle;
  }

  valueIsBlocked(value) {
    return this.values.has(value);
  }

  updateToggle(toggleElement, value) {
    toggleElement.setAttribute(
      "data-hns-blocked-attribute",
      this.valueIsBlocked(value)
    );
  }

  blockValue(value, updateStorage = true) {
    if (this.values.has(value)) return;
    this.values.add(value);
    this.updateTogglesWithValue(value);
    if (!updateStorage) return;
    this.#changes.set(value, "block");
    this.updateLocalStorage();
  }

  unblockValue(value, updateStorage = true) {
    const valueWasBlocked = this.values.delete(value);
    if (!valueWasBlocked) return;
    this.updateTogglesWithValue(value);
    if (!updateStorage) return;
    this.#changes.set(value, "unblock");
    this.updateLocalStorage();
  }

  updateTogglesWithValue(value) {
    const togglesWithValue = document.querySelectorAll(
      `.hns-container [data-hns-attribute-value="${value}"]`
    );

    if (!togglesWithValue.length) return;

    togglesWithValue.forEach((toggleWithValue) =>
      this.updateToggle(toggleWithValue, value)
    );
  }

  updateLocalStorage() {
    const emptiedBackups = Object.fromEntries(
      [...AttributeBlocker.valueStorageKeys].map((valueStorageKey) => [
        `${valueStorageKey}.backup`,
        [],
      ])
    );

    const changes = Object.assign(
      {
        [this.storageKey]: [...this.values],
      },
      emptiedBackups
    );
    chrome.storage.local.set(changes);
    this.#changes.clear();
  }
}
