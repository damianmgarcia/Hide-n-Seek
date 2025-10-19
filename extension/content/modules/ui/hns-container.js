const hnsContainer = {
  name: "hns-container",

  html: `
    <div class="hns-container">
      <div class="hns-unblocked-job">
        <button class="hns-block-button">
          <svg viewBox="1.196 4.287 42.55 42.55">
            <path/>
          </svg>
        </button>
      </div>
      <div class="hns-blocked-job toggles"></div>
    </div>`,

  createComponent(element, jobBoardId) {
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    element.addEventListener("click", (event) => event.stopPropagation());
    element.querySelector(".hns-block-button").addEventListener("click", () => {
      if (defaultToggle) defaultToggle.element.click();
    });

    const toggles = new Map();
    const togglesContainer = element.querySelector(".toggles");
    let defaultToggle;

    const getToggleId = (jobAttribute, jobAttributeValue) =>
      `${jobAttribute}__${jobAttributeValue}`;

    const getToggle = (jobAttribute, jobAttributeValue) =>
      toggles.get(getToggleId(jobAttribute, jobAttributeValue));

    const addToggle = (
      jobAttribute,
      jobAttributeValue,
      jobAttributeName,
      defaultAttribute,
      removeOnToggleOff,
      toggledOn,
      onToggle
    ) => {
      const toggleId = getToggleId(jobAttribute, jobAttributeValue);
      if (toggles.has(toggleId) || (removeOnToggleOff && !toggledOn)) return;

      const toggle = ui.createComponent(
        "hns-block-attribute-toggle",
        jobAttribute,
        jobAttributeValue,
        jobAttributeName,
        defaultAttribute,
        removeOnToggleOff,
        toggledOn,
        onToggle
      );

      if (defaultAttribute) defaultToggle = toggle;

      togglesContainer.prepend(toggle.element);
      toggles.set(toggleId, toggle);
    };

    const removeToggle = (jobAttribute, jobAttributeValue) => {
      toggles.delete(getToggleId(jobAttribute, jobAttributeValue));
      console.log(toggles);
    };

    return { element, addToggle, removeToggle, getToggle };
  },
};

ui.registerTemplate(
  hnsContainer.name,
  hnsContainer.html,
  hnsContainer.createComponent
);
