const creatorFor = {};

const registerTemplate = (name, html, processor = (element) => element) => {
  const template = document.createElement("template");
  template.innerHTML = html;
  creatorFor[name] = (...args) =>
    processor(template.content.firstElementChild.cloneNode(true), ...args);
};

const createElement = (name, ...args) => creatorFor[name](...args);

export { registerTemplate, createElement };
