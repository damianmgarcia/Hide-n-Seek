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
      <div class="hns-blocked-job"></div>
    </div>
  `,

  process(element, jobBoardId) {
    const component = { element, jobBoardId };
    const toggles = new Set();
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    element.addEventListener("click", (event) => event.stopPropagation());
    const hnsBlockedJob = element.querySelector(".hns-blocked-job");
    component.toggles = toggles;
    component.addToggle = (toggle) => {
      hnsBlockedJob.prepend(toggle.element);
      toggles.add(toggle);
      return toggle;
    };
    component.removeToggle = (jobAttribute, jobAttributeValue) => {
      const toggle = [...toggles].find(
        (toggle) =>
          toggle.jobAttribute === jobAttribute &&
          toggle.jobAttributeValue === jobAttributeValue
      );
      if (toggle) {
        toggle.element.remove();
      }
      return toggles.delete(toggle);
    };
    element.querySelector(".hns-block-button").addEventListener("click", () => {
      const defaultToggle = element.querySelector(
        ".hns-block-attribute-toggle[data-hns-default-attribute]"
      );
      if (defaultToggle) defaultToggle.click();
    });
    return component;
  },
};

ui.registerTemplate(hnsContainer.name, hnsContainer.html, hnsContainer.process);
