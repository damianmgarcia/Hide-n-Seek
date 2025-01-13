const hnsToggle = {
  name: "hns-toggle",

  html: `
    <button class="hns-block-attribute-toggle">
      <div class="hns-block-attribute-toggle-text"></div>
      <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
    </button>`,

  process(element, jobAttribute, jobAttributeValue) {
    element.title = jobAttributeValue;
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;
    return element;
  },
};

ui.registerElement(hnsToggle.name, hnsToggle.html, hnsToggle.process);
