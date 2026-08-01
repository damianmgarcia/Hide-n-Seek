const hnsMenu = {
  name: "hns-menu",

  html: `
    <div class="hns-menu">
      <ul></ul>
    </div>`,

  createComponent(element, items = [], id = "hns-menu") {
    const existingMenu = document.querySelector(`#${id}`);
    if (existingMenu) existingMenu.remove();
    element.id = id;
    const list = element.querySelector("ul");
    for (const item of items) {
      const listItem = document.createElement("li");
      listItem.append(item);
      list.append(listItem);
    }
    return { element };
  },
};

ui.registerTemplate(hnsMenu.name, hnsMenu.html, hnsMenu.createComponent);
