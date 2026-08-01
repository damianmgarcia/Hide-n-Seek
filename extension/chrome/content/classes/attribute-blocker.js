class AttributeBlocker {
  static storageKeys = new Set();
  static backupStorageKeys = new Set();

  #changes = new Map();

  constructor(jobBoard, attribute, storage, hnsMap) {
    this.jobBoard = jobBoard;
    this.attribute = attribute;
    this.hnsMap = hnsMap;
    this.getValue = getAttributeValueGetter(attribute);
    this.storageKey = attribute.storageKey;
    this.backupStorageKey = attribute.backupStorageKey;
    this.blockedValues = new Set(storage[this.storageKey]);
    this.valueIsBlocked = (() => {
      if (attribute.valueMatch === "exact") {
        return (value) => this.blockedValues.has(value);
      } else if (attribute.valueMatch === "pattern") {
        return (value, pattern) => {
          const regexMatch = /^\/(?<pattern>.+)\/(?<flags>[dgimsuy]*)$/.exec(
            pattern,
          );
          if (regexMatch) {
            return new RegExp(
              regexMatch.groups.pattern,
              [...new Set(regexMatch.groups.flags.split(""))].join(""),
            ).test(value);
          } else {
            return new RegExp("\\b" + pattern + "\\b", "i").test(value);
          }
        };
      }
    })();

    AttributeBlocker.storageKeys.add(this.storageKey);
    AttributeBlocker.backupStorageKeys.add(this.backupStorageKey);

    const storagePropertiesToSet = [this.storageKey, this.backupStorageKey]
      .filter((storageKey) => !Object.hasOwn(storage, storageKey))
      .map((storageKey) => [storageKey, []]);

    if (storagePropertiesToSet.length)
      chrome.storage.local.set(Object.fromEntries(storagePropertiesToSet));
  }

  handleStorageChanges(changes) {
    const blockedValuesFromStorage = new Set(changes.newValue);

    const mergedChanges = new Map([
      ...[...blockedValuesFromStorage]
        .filter(
          (blockedValueFromStorage) =>
            !this.blockedValues.has(blockedValueFromStorage),
        )
        .map((value) => [value, "block"]),
      ...[...this.blockedValues]
        .filter((value) => !blockedValuesFromStorage.has(value))
        .map((value) => [value, "unblock"]),
      ...this.#changes,
    ]);

    mergedChanges.forEach((action, value) =>
      action === "block"
        ? this.blockValue(value, false)
        : this.unblockValue(value, false),
    );
  }

  addToggles(hns) {
    let value = this.getValue(hns.jobListing);
    if (!value) return;

    if (this.attribute.removableValues) {
      for (const blockedValue of this.blockedValues) {
        hns.addToggle(
          this.attribute,
          blockedValue,
          this.valueIsBlocked(value, blockedValue),
          () => this.unblockValue(blockedValue),
        );
      }
    } else {
      hns.addToggle(this.attribute, value, this.valueIsBlocked(value), () => {
        if (this.valueIsBlocked(value)) {
          this.unblockValue(value);
        } else {
          this.blockValue(value);
        }
      });
    }
  }

  blockValue(value, updateStorage = true) {
    if (this.blockedValues.has(value)) return;
    this.blockedValues.add(value);
    this.updateHnss(value, "block");
    if (!updateStorage) return;
    this.#changes.set(value, "block");
    this.updateLocalStorage();
  }

  unblockValue(value, updateStorage = true) {
    const valueWasBlocked = this.blockedValues.delete(value);
    if (!valueWasBlocked) return;
    this.updateHnss(value, "unblock");
    if (!updateStorage) return;
    this.#changes.set(value, "unblock");
    this.updateLocalStorage();
  }

  updateHnss(value, action) {
    for (const hns of this.hnsMap.values()) {
      const toggle = hns.getToggle(this.attribute.id, value);
      if (toggle) {
        if (action === "block") {
          toggle.toggleOn();
        } else {
          toggle.toggleOff();
          if (this.attribute.removableValues)
            hns.removeToggle(this.attribute.id, value);
        }
      } else if (this.attribute.removableValues && action === "block") {
        this.addToggles(hns);
      }
    }
  }

  updateLocalStorage() {
    const emptiedBackups = Object.fromEntries(
      [...AttributeBlocker.backupStorageKeys].map((backupStorageKey) => [
        backupStorageKey,
        [],
      ]),
    );
    const changes = {
      [this.storageKey]: [...this.blockedValues],
      ...emptiedBackups,
    };
    chrome.storage.local.set(changes);
    this.#changes.clear();
  }
}
