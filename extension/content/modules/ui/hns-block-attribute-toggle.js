const hnsToggle = {
  name: "hns-block-attribute-toggle",

  html: `
    <button class="hns-block-attribute-toggle">
      <div class="hns-block-attribute-toggle-attribute"></div>
      <div class="hns-block-attribute-toggle-text"></div>
      <div class="hns-block-attribute-toggle-hidden-indicator">Hidden</div>
    </button>`,

  createComponent(
    element,
    jobAttribute,
    jobAttributeValue,
    jobAttributeName,
    defaultAttribute,
    removeOnToggleOff,
    toggledOn,
    onToggle
  ) {
    element.title = `${jobAttributeName}: ${jobAttributeValue}`;
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    element.querySelector(".hns-block-attribute-toggle-attribute").textContent =
      jobAttributeName;
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;
    element.addEventListener("click", onToggle);

    if (defaultAttribute)
      element.setAttribute("data-hns-default-attribute", "");

    const removeToggle = async () => {
      element.disabled = true;
      const animationsFinished = Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      );
      const fallbackTimer = new Promise((resolve) => setTimeout(resolve, 400));
      await Promise.race([animationsFinished, fallbackTimer]);
      element.remove();
    };

    const toggleOn = () => {
      element.setAttribute("data-hns-blocked-attribute", "");
    };

    const toggleOff = () => {
      element.removeAttribute("data-hns-blocked-attribute");
      if (removeOnToggleOff) removeToggle();
    };

    const toggle = () => {
      const toggledOn = element.hasAttribute("data-hns-blocked-attribute");
      if (toggledOn) {
        toggleOff();
      } else {
        toggleOn();
      }
      return toggledOn;
    };

    if (toggledOn) toggleOn();

    return {
      element,
      jobAttribute,
      jobAttributeValue,
      jobAttributeName,
      defaultAttribute,
      removeToggle,
      toggleOn,
      toggleOff,
      toggle,
    };
  },
};

ui.registerTemplate(hnsToggle.name, hnsToggle.html, hnsToggle.createComponent);
