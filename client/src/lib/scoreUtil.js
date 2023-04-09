let lastID = 1;
export function newID() {
  return lastID++;
}

export function newCategory(
  initial = {
    name: "",
    weight: 1,
    pointsNum: null,
    pointsDenom: 100,
  }
) {
  const id = newID();
  return {
    ...initial,
    id: id,
  };
}

export function calculateScore(categoryObj, doCap = true, env = {}) {
  function calculateScoreHelper(obj, doCap, env) {
    const pointsNum = obj.pointsNum ?? obj.score ?? null;
    const pointsDenom = obj.pointsDenom ?? 100;

    const score = pointsNum !== null ? (pointsNum / pointsDenom) * 100 : null;

    // If leaf node, just return score
    if (obj.children === undefined) {
      if (score === null && obj.name in env) {
        return env[obj.name];
      }
      return score;
    }

    // Otherwise, must compute score from children
    let totalWeight = 0;
    let totalSum = 0;

    const children =
      obj.dropCount !== undefined && obj.dropCount > 0
        ? markChildrenToBeDropped(obj.children, obj.dropCount, doCap, env).filter((c) => !c.isDropped)
        : obj.children;

    for (let child of children) {
      const score = calculateScoreHelper(child, doCap, env);
      if (score !== null) {
        if (!child.isBonus) {
          totalWeight += child.weight;
        }
        totalSum += child.weight * score;
      }
    }
    if (totalWeight === 0) return null;

    const computedScore = totalSum / totalWeight;
    if (obj.capped && computedScore > 100 && doCap) return 100;
    return computedScore;
  }

  const rawScore = calculateScoreHelper(categoryObj, doCap, env);
  if (rawScore === null) return null;
  if (categoryObj.capped && rawScore > 100 && doCap) return 100;
  return rawScore;
}

export function addIDs(categoryObj) {
  if (categoryObj.id === undefined) {
    categoryObj.id = newID();
  }
  if (categoryObj.children !== undefined) {
    categoryObj.children = categoryObj.children.map((child) => addIDs(child));
  }
  return categoryObj;
}

export function cleanUpBeforeSaving(categoryObj) {
  delete categoryObj.id;
  if (categoryObj.children === undefined) {
    delete categoryObj.capped;
    delete categoryObj.dropCount;
    delete categoryObj.childrenWeightMode;
    if (categoryObj.pointsDenom === undefined) categoryObj.pointsDenom = 100;
    categoryObj.pointsNum ??= categoryObj.score ?? null;
    delete categoryObj.score;
  } else {
    delete categoryObj.pointsNum;
    delete categoryObj.pointsDenom;
    delete categoryObj.score;
    categoryObj.children = categoryObj.children.map((child) => cleanUpBeforeSaving(child));
  }
  delete categoryObj.isDropped;

  return categoryObj;
}

export function markChildrenToBeDropped(childrenArray, numToDrop, doCap = true, env = {}) {
  const scored = childrenArray
    .map((c, idx) => ({ ...c, score: calculateScore(c, doCap, env), idx }))
    .filter((c) => !c.isBonus && c.weight !== null && c.score !== null);

  const sorted = scored.sort((left, right) => left.score - right.score);
  const idxsToDrop = sorted.filter((c, idx) => idx < numToDrop).map((c) => c.idx);

  return childrenArray.map((c, idx) => ({ ...c, isDropped: idxsToDrop.includes(idx) }));
}

export function extractUnknowns(data) {
  if (!data.name || !data.weight) return [];
  if (data.children === undefined) return data.pointsNum === null ? [data.name] : [];
  return data.children.reduce((total, child) => [...total, ...extractUnknowns(child)], []);
}
