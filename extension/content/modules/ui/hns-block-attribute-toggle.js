const hnsToggle = {
  name: "hns-block-attribute-toggle",

  html: `
    <button class="hns-block-attribute-toggle">
      <div class="hns-block-attribute-toggle-attribute"></div>
      <div class="hns-block-attribute-toggle-text"></div>
      <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
    </button>`,

  process(
    element,
    jobAttributeName,
    jobAttribute,
    jobAttributeValue,
    defaultAttribute
  ) {
    const component = { element, jobAttribute, jobAttributeValue };
    element.title = jobAttributeValue;
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    element.querySelector(".hns-block-attribute-toggle-attribute").textContent =
      jobAttributeName;
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;
    if (defaultAttribute)
      element.setAttribute("data-hns-default-attribute", "");
    return component;
  },
};

ui.registerTemplate(hnsToggle.name, hnsToggle.html, hnsToggle.process);
