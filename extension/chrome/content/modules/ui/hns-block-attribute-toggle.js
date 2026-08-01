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
    removeOnToggleOff,
    toggledOn,
    onToggle,
    blockButtonToggle,
  ) {
    element.setAttribute("data-hns-attribute", jobAttribute);
    element.setAttribute("data-hns-attribute-name", jobAttributeName);
    element.setAttribute("data-hns-attribute-value", jobAttributeValue);
    if (blockButtonToggle)
      element.setAttribute("data-hns-block-button-toggle", "");
    element.querySelector(".hns-block-attribute-toggle-attribute").textContent =
      jobAttributeName;
    element.querySelector(".hns-block-attribute-toggle-text").textContent =
      jobAttributeValue;
    element.addEventListener("click", onToggle);

    const removeToggle = async () => {
      element.disabled = true;
      const animationsFinished = Promise.allSettled(
        element.getAnimations().map((animation) => animation.finished),
      );
      const fallbackTimer = new Promise((resolve) => setTimeout(resolve, 400));
      await Promise.any([animationsFinished, fallbackTimer]);
      element.remove();
    };

    const label = `${jobAttributeName}: ${jobAttributeValue}`;

    const toggleOn = () => {
      element.setAttribute("data-hns-blocked-attribute", "");
      element.setAttribute("aria-label", `Unblock ${label}`);
      element.setAttribute("aria-pressed", "true");
    };

    const toggleOff = () => {
      element.removeAttribute("data-hns-blocked-attribute");
      element.setAttribute("aria-label", `Bock ${label}`);
      element.setAttribute("aria-pressed", "false");
      if (removeOnToggleOff) removeToggle();
    };

    if (toggledOn) {
      toggleOn();
    } else {
      toggleOff();
    }

    return {
      element,
      jobAttribute,
      jobAttributeValue,
      jobAttributeName,
      removeToggle,
      toggleOn,
      toggleOff,
    };
  },
};

ui.registerTemplate(hnsToggle.name, hnsToggle.html, hnsToggle.createComponent);
