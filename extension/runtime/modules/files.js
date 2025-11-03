const download = (url, fileName) => {
  const tempAnchor = document.createElement("a");
  tempAnchor.style.setProperty("display", "none");
  tempAnchor.href = url;
  tempAnchor.download = fileName;
  document.body.append(tempAnchor);
  tempAnchor.click();
  tempAnchor.remove();
};

const upload = (handler) => {
  const tempFileInput = document.createElement("input");
  tempFileInput.type = "file";
  tempFileInput.accept = ".json";
  tempFileInput.addEventListener("change", () => handler(tempFileInput.files), {
    once: true,
  });
  tempFileInput.click();
  tempFileInput.remove();
};

export { download, upload };
