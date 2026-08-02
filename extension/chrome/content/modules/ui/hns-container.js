const hnsContainer = {
  name: "hns-container",

  html: `
    <div class="hns-container">
      <div class="hns-unblocked-job">
        <button class="hns-block-button">
          <svg aria-hidden="true" viewBox="1.196 4.287 42.55 42.55">
            <path/>
          </svg>
        </button>
      </div>
      <div class="hns-blocked-job toggles"></div>
    </div>`,

  createComponent(element, jobBoardId, attributeBlockers) {
    element.setAttribute("data-hns-job-board-id", jobBoardId);
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const blockButton = element.querySelector(".hns-block-button");
    let blockButtonAssignedToggle;
    blockButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (blockButtonAssignedToggle) {
        blockButtonAssignedToggle.click();
        blockButtonAssignedToggle.focus();
      } else {
        showBlockOptionsMenu();
      }
    });

    const showBlockOptionsMenu = () => {
      const cancelButton = document.createElement("button");
      cancelButton.textContent = "Cancel";
      cancelButton.classList.add("black-button");
      const cancelClickPromise = new Promise((resolve) =>
        cancelButton.addEventListener("click", resolve),
      );

      const blockButtonToggles = element.querySelectorAll(
        "[data-hns-block-button-toggle]",
      );
      const blockAttributeButtons = [...blockButtonToggles].map(
        (blockButtonToggle) => {
          const blockAttributeButton = document.createElement("button");
          blockAttributeButton.textContent = `Block ${blockButtonToggle.getAttribute("data-hns-attribute-name")}`;
          const blockAttributeButtonClickPromise = new Promise((resolve) => {
            blockAttributeButton.addEventListener("click", (event) => {
              event.preventDefault();
              blockButtonToggle.click();
              blockButtonToggle.focus();
              resolve(event);
            });
          });
          return {
            element: blockAttributeButton,
            clickPromise: blockAttributeButtonClickPromise,
          };
        },
      );

      const keywordInput = document.createElement("input");
      keywordInput.type = "text";
      keywordInput.name = "hns-block-keyword";
      keywordInput.placeholder = "Block keyword";
      keywordInput.setAttribute("aria-label", keywordInput.placeholder);
      const keywordAttributeBlocker = attributeBlockers.find(
        (attributeBlocker) => attributeBlocker.attribute.id === "keyword",
      );
      const keywordSubmitPromise = new Promise((resolve) => {
        keywordInput.addEventListener("keydown", (keyboardEvent) => {
          if (keyboardEvent.key === "Enter" && !keyboardEvent.repeat) {
            const trimmedValue = keywordInput.value.trim();
            if (!trimmedValue) return;
            keywordAttributeBlocker.blockValue(trimmedValue);
            resolve(keyboardEvent);
          }
        });
      });

      const menu = ui.createComponent("hns-menu", [
        keywordInput,
        ...blockAttributeButtons.map(
          (blockAttributeButton) => blockAttributeButton.element,
        ),
        cancelButton,
      ]);
      menu.element.classList.add("hns-block-options");
      menu.element.setAttribute("aria-label", "Block options");
      Promise.any([
        cancelClickPromise,
        keywordSubmitPromise,
        ...blockAttributeButtons.map(
          (blockAttributeButton) => blockAttributeButton.clickPromise,
        ),
      ]).then((event) => {
        event.preventDefault();
        blockButton.setAttribute("aria-expanded", "false");
        menu.element.remove();
        if (event.target === cancelButton) {
          blockButton.focus();
        } else if (event.target === keywordInput) {
          const valueToggleButton = element.querySelector(
            `[data-hns-attribute-value="${keywordInput.value.trim()}"]`,
          );
          if (valueToggleButton) {
            valueToggleButton.focus();
          } else {
            blockButton.focus();
          }
        }
      });

      blockButton.setAttribute("aria-expanded", "true");
      blockButton.insertAdjacentElement("afterend", menu.element);
      keywordInput.focus();
    };

    const updateBlockButton = async (attribute) => {
      const blockButtonAttribute =
        attribute || (await chrome.storage.local.get()).blockButtonAttribute;
      blockButtonAssignedToggle = element.querySelector(
        `[data-hns-attribute="${blockButtonAttribute}"]`,
      );
      if (blockButtonAssignedToggle) {
        blockButton.setAttribute(
          "aria-label",
          `Block: ${blockButtonAssignedToggle.getAttribute("data-hns-attribute-name")}: ${blockButtonAssignedToggle.getAttribute("data-hns-attribute-value")}`,
        );
        blockButton.removeAttribute("aria-haspopup");
        blockButton.removeAttribute("aria-controls");
        blockButton.removeAttribute("aria-expanded");
      } else {
        blockButton.setAttribute("aria-label", "Show block options");
        blockButton.setAttribute("aria-haspopup", "menu");
        blockButton.setAttribute("aria-controls", "hns-block-options");
        if (!attribute) blockButton.setAttribute("aria-expanded", "false");
      }
    };
    updateBlockButton();

    chrome.storage.local.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, "blockButtonAttribute"))
        updateBlockButton(changes.blockButtonAttribute.newValue);
    });

    const toggles = new Map();
    const togglesContainer = element.querySelector(".toggles");

    const getToggleId = (jobAttribute, jobAttributeValue) =>
      `${jobAttribute}__${jobAttributeValue}`;

    const getToggle = (jobAttribute, jobAttributeValue) =>
      toggles.get(getToggleId(jobAttribute, jobAttributeValue));

    const addToggle = (attribute, jobAttributeValue, toggledOn, onToggle) => {
      const toggleId = getToggleId(attribute.id, jobAttributeValue);
      if (toggles.has(toggleId) || (attribute.removableValues && !toggledOn))
        return;
      const originalOnToggle = onToggle;
      onToggle = (event) => {
        originalOnToggle();
        if (!element.querySelector("[data-hns-blocked-attribute]")) {
          event.preventDefault();
          blockButton.focus();
        }
      };

      const toggle = ui.createComponent(
        "hns-block-attribute-toggle",
        attribute.id,
        jobAttributeValue,
        attribute.name,
        attribute.removableValues,
        toggledOn,
        onToggle,
        attribute.blockButton,
      );

      togglesContainer.prepend(toggle.element);
      toggles.set(toggleId, toggle);
    };

    const removeToggle = (jobAttribute, jobAttributeValue) => {
      toggles.delete(getToggleId(jobAttribute, jobAttributeValue));
    };

    return { element, addToggle, removeToggle, getToggle };
  },
};

ui.registerTemplate(
  hnsContainer.name,
  hnsContainer.html,
  hnsContainer.createComponent,
);
