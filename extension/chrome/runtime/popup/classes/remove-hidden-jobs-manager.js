class RemoveHiddenJobsManager {
  checkboxInput = document.querySelector("input[name='remove-hidden-jobs']");
  checkboxLabel = this.checkboxInput.closest("label");

  constructor(jobBoard, storage) {
    this.removeHiddenJobsStorageKey = `JobDisplayManager.${jobBoard.id}.removeHiddenJobs`;

    chrome.storage.local.onChanged.addListener((changes) => {
      const containsChangesToRemoveHiddenJobs = Object.hasOwn(
        changes,
        this.removeHiddenJobsStorageKey
      );

      if (!containsChangesToRemoveHiddenJobs) return;

      this.checkboxInput.checked =
        changes[this.removeHiddenJobsStorageKey].newValue;
      this.checkboxLabel.setAttribute(
        "data-checked",
        this.checkboxInput.checked
      );
    });

    this.checkboxInput.addEventListener("input", () => {
      this.checkboxLabel.setAttribute(
        "data-checked",
        this.checkboxInput.checked
      );
      chrome.storage.local.set({
        [this.removeHiddenJobsStorageKey]: this.checkboxInput.checked,
      });
    });

    this.checkboxInput.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key !== "Enter" || keyboardEvent.repeat) return;

      this.checkboxInput.checked = this.checkboxInput.checked ? false : true;
      this.checkboxInput.dispatchEvent(new Event("input"));
    });

    const removeHiddenJobsStorageKeyFound = Object.hasOwn(
      storage,
      this.removeHiddenJobsStorageKey
    );

    const removeHiddenJobs = removeHiddenJobsStorageKeyFound
      ? storage[this.removeHiddenJobsStorageKey]
      : false;

    this.checkboxInput.checked = removeHiddenJobs;
    this.checkboxLabel.setAttribute("data-checked", removeHiddenJobs);
  }
}

export { RemoveHiddenJobsManager };
