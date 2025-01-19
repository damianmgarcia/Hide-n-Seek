const hnsContainer = {
  name: "hns-container",

  html: `
    <div class="hns-container">
      <div class="hns-unblocked-job-overlay">
        <div class="hns-block-button">
          <svg viewBox="1.196 4.287 42.55 42.55">
            <path/>
          </svg>
        </div>
      </div>
      <div class="hns-blocked-job-overlay"></div>
    </div>
  `,

  process(element, jobBoardId, toggles) {
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    element.addEventListener("click", (event) => event.stopPropagation());
    const toggleContainer = element.querySelector(".hns-blocked-job-overlay");
    toggles.forEach((toggle) => toggleContainer.prepend(toggle));
    element.querySelector(".hns-block-button").addEventListener("click", () => {
      const defaultToggle = element.querySelector(
        ".hns-block-attribute-toggle[data-hns-default-attribute]"
      );
      if (defaultToggle) defaultToggle.click();
    });
    return element;
  },
};

ui.registerElement(hnsContainer.name, hnsContainer.html, hnsContainer.process);
