const download = (url, fileName) => {
  const tempAnchor = document.createElement("a");
  tempAnchor.style.setProperty("display", "none");
  tempAnchor.href = url;
  tempAnchor.download = fileName;
  document.body.append(tempAnchor);
  tempAnchor.click();
  tempAnchor.remove();
};

const upload = () => {
  return new Promise((resolve, reject) => {
    const tempFileInput = document.createElement("input");
    tempFileInput.type = "file";
    tempFileInput.accept = ".json";
    tempFileInput.addEventListener(
      "change",
      () => resolve(tempFileInput.files),
      { once: true }
    );
    tempFileInput.addEventListener("cancel", reject, { once: true });
    tempFileInput.click();
    tempFileInput.remove();
  });
};

export { download, upload };
