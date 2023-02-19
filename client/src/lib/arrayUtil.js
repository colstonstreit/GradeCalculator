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
