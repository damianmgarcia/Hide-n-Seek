import { registerTemplate } from "./ui.js";

const infoBox = {
  name: "info-box",

  html: `
    <div class="info-box">
      <div class="info-box-icon"></div>
      <div class="info-box-message"></div>
    </div>
  `,

  process(element, type, message) {
    if (type === "warning") {
      element.classList.add("warning");
      element.querySelector(".info-box-icon").textContent = "!";
    }
    element.querySelector(".info-box-message").textContent = message;
    return element;
  },
};

registerTemplate(infoBox.name, infoBox.html, infoBox.process);
