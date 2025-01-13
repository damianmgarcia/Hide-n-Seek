const hnsElement = {
  name: "hns-element",

  html: `
    <div class="hns-element" style="display: none;">
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

  process(element, jobBoardId) {
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    return element;
  },
};

ui.registerElement(hnsElement.name, hnsElement.html, hnsElement.process);
