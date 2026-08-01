const getAttributeValueGetter = (() => {
  const processorFor = {
    match(text, { pattern, flags }) {
      const match = text.match(new RegExp(pattern, flags));
      return match ? match[0] : "";
    },

    replace(text, { pattern, flags, replacement }) {
      return text.replace(new RegExp(pattern, flags), replacement);
    },

    subtract(text, { selector }, element) {
      return text.replace(element.querySelector(selector)?.innerText || "", "");
    },

    addText(text, { textToAdd }, element) {
      return text + textToAdd;
    },
  };

  return (attribute) => (jobListing) => {
    const valueComponents = [];
    for (const valueComposition of attribute.valueComposition) {
      const element = valueComposition.selector
        ? jobListing.querySelector(valueComposition.selector)
        : jobListing;
      if (!element) return "";
      const valueComponent = valueComposition.processors.reduce(
        (value, processor) =>
          processorFor[processor.process](value, processor, element),
        element.innerText,
      );
      valueComponents.push(valueComponent);
    }
    return valueComponents.join("");
  };
})();
