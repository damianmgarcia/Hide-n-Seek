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

const safeAwait = async (functionToAwait, ...args) => {
  try {
    return await functionToAwait(...args);
  } catch (error) {
    console.log(error);
  }
};

export { chunk, debounce, difference, safeAwait };
