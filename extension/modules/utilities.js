const chunk = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

const difference = (arrayA, arrayB) => {
  return arrayA.filter((item) => !arrayB.includes(item));
};

const debounce = (func, delay = 0) => {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func, delay, ...args);
  };
};

export { chunk, debounce, difference };
