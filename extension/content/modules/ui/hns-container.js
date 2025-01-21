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

  process(element, jobBoardId, toggles) {
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    element.addEventListener("click", (event) => event.stopPropagation());
    const hnsBlockedJob = element.querySelector(".hns-blocked-job");
    toggles.forEach((toggle) => hnsBlockedJob.prepend(toggle));
    element.querySelector(".hns-block-button").addEventListener("click", () => {
      const defaultToggle = element.querySelector(
        ".hns-block-attribute-toggle[data-hns-default-attribute]"
      );
      if (defaultToggle) defaultToggle.click();
    });
    return element;
  },
};

ui.registerTemplate(hnsContainer.name, hnsContainer.html, hnsContainer.process);
