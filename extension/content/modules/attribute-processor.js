const createAttributeProcessor = (() => {
  const processorFor = {
    replace(text, { pattern, flags, replacement }) {
      return text.replace(new RegExp(pattern, flags), replacement);
    },

    match(text, { pattern, flags }) {
      const match = text.match(new RegExp(pattern, flags));
      return match ? match[0] : "";
    },
  };

  return (attribute) => {
    return (jobListing) => {
      const element = jobListing.querySelector(attribute.selector);
      if (!element) return "";
      return attribute.processors.reduce(
        (value, processor) => processorFor[processor.process](value, processor),
        element.textContent
      );
    };
  };
})();
