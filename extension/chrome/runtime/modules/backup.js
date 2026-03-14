import { download, upload } from "./files.js";

const backup = async function () {
  const data = await chrome.storage.local.get();
  delete data.syncError;
  const jsonStorage = JSON.stringify(data, null, 2);
  const encodedJsonStorage = new TextEncoder().encode(jsonStorage);
  const base64Storage = btoa(
    encodedJsonStorage.reduce(function (data, byte) {
      return data + String.fromCodePoint(byte);
    }, "")
  );
  const dataUri = `data:application/json;base64,${base64Storage}`;
  const fileName = `hide-n-seek-backup-${Date.now()}.json`;

  download(dataUri, fileName);
};

const restore = async function () {
  try {
    const fileList = await upload();
    const file = fileList[0];
    const fileText = await file.text();
    const jsonStorage = JSON.parse(fileText);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(jsonStorage);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export { backup, restore };
