const createAttributeProcessor = (() => {
  const processorFor = {
    match(text, { pattern, flags }) {
      const match = text.match(new RegExp(pattern, flags));
      return match ? match[0] : "";
    },

    replace(text, { pattern, flags, replacement }) {
      return text.replace(new RegExp(pattern, flags), replacement);
    },

    subtract(text, { selector }, element) {
      return text.replace(
        element.querySelector(selector)?.textContent || "",
        ""
      );
    },
  };

  return (attribute) => {
    return (jobListing) => {
      const element = attribute.selector
        ? jobListing.querySelector(attribute.selector)
        : jobListing;
      if (!element) return "";
      return attribute.processors.reduce(
        (value, processor) =>
          processorFor[processor.process](value, processor, element),
        element.textContent
      );
    };
  };
})();
