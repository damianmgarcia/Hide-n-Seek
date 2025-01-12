const ui = (() => {
  const creatorFor = {};

  const registerElement = (name, html, processor = (element) => element) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    creatorFor[name] = (...args) =>
      processor(template.content.firstElementChild.cloneNode(true), ...args);
  };

  const createElement = (name, ...args) => creatorFor[name](...args);

  return { registerElement, createElement };
})();

const hnsElement = (() => {
  const name = "hns-element";
  const html = `
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

  return { name, html };
})();

ui.registerElement(hnsElement.name, hnsElement.html);

const hnsToggle = (() => {
  const name = "hns-toggle";
  const html = `
    <button class="hns-block-attribute-toggle">
      <div class="hns-block-attribute-toggle-text"></div>
      <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
    </button>
  `;

  const process = (element, jobAttribute, jobAttributeValue) => {
    element.title = jobAttributeValue;
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;

    return element;
  };

  return { name, html, process };
})();

ui.registerElement(hnsToggle.name, hnsToggle.html, hnsToggle.process);
