export function deleteFromArray(array, idx) {
  const arrayCopy = [...array];
  arrayCopy.splice(idx, 1);
  return arrayCopy;
}

export function addToArray(array, idx, item) {
  const arrayCopy = [...array];
  arrayCopy.splice(idx + 1, 0, item);
  return arrayCopy;
}

export function replaceInArray(array, idx, item) {
  const arrayCopy = [...array];
  arrayCopy[idx] = item;
  return arrayCopy;
}

export function swapInArray(array, idx1, idx2) {
  const arrayCopy = [...array];
  arrayCopy[idx1] = array[idx2];
  arrayCopy[idx2] = array[idx1];
  return arrayCopy;
}

export function createDeepCopy(obj) {
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    const newObj = [];
    for (const entry of obj) {
      newObj.push(createDeepCopy(entry));
    }
    return newObj;
  } else {
    const newObj = { ...obj };
    for (const field in obj) {
      if (typeof obj[field] === "object") {
        if (obj[field] === null) continue;
        else newObj[field] = createDeepCopy(obj[field]);
      }
    }
    return newObj;
  }
}
