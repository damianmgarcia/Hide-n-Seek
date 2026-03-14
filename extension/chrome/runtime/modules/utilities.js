const chunk = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

const difference = (listA, listB) => {
  const [setA, setB] = [listA, listB].map((list) =>
    list instanceof Set ? list : new Set(list),
  );
  return Set.prototype.difference
    ? [...setA.difference(setB)]
    : [...setA].filter((item) => !setB.has(item));
};

const debounce = (func, delay = 0) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func, delay, ...args);
  };
};

const safeAwait = async (functionToAwait, ...args) => {
  try {
    return await functionToAwait(...args);
  } catch (error) {
    console.log(error);
  }
};

export { chunk, debounce, difference, safeAwait };
