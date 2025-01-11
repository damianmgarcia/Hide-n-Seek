const ui = {};

ui.registerElement = () => {};

ui.createElement = (tag, ...args) => {};

hnsElementTemplate = document.createElement("template");
hnsElementTemplate.innerHTML = `
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
`;
hnsElementTemplate.content.firstElementChild.cloneNode(true);

toggleButtonTemplate = document.createElement("template");
toggleButtonTemplate.innerHTML = `
  <button class="hns-block-attribute-toggle">
    <div class="hns-block-attribute-toggle-text"></div>
    <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
  </button>
`;
toggleButtonTemplate.content.firstElementChild.cloneNode(true);
