const hnsToggle = {
  name: "hns-block-attribute-toggle",

  html: `
    <button class="hns-block-attribute-toggle">
      <div class="hns-block-attribute-toggle-text"></div>
      <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
    </button>`,

  process(element, jobAttribute, jobAttributeValue, defaultAttribute) {
    element.title = jobAttributeValue;
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;
    if (defaultAttribute)
      element.setAttribute("data-hns-default-attribute", "");
    return element;
  },
};

ui.registerTemplate(hnsToggle.name, hnsToggle.html, hnsToggle.process);
