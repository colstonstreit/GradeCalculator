export default function createDeepCopy(obj) {
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
