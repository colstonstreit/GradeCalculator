import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as ArrayUtil from "../lib/arrayUtil";
import StorageAPI from "../lib/storageAPI";
import AuthenticatedPage from "./AuthenticatedPage";
import { DeleteIcon, DownIcon, PlusIcon, SettingsIcon, UpIcon } from "./Icons";

const numRegex = /^([0-9]+((\.)|(\.[0-9]{0,3}))?)?$/;
const alphaNumRegex = /^([0-9a-zA-z ]){0,20}$/;
const depthColors = ["#777", "#AAA", "#DDD", "#FFF"];

const ChildrenWeightModes = Object.freeze({
  FORCED_EQUAL: "forced equal",
  CUSTOMIZABLE: "customizable",
  POINT_BASED: "point-based",
});

function SmartInput({ regex, numeric, initValue = "", handleUpdate, className = "", ...rest }) {
  const [value, setValue] = useState(initValue);

  useEffect(() => setValue(initValue), [initValue]);

  function onUpdate(e) {
    if (regex.test(e.target.value)) {
      setValue(e.target.value);
      if (numeric) {
        if (
          handleUpdate(!isNaN(e.target.value) && e.target.value !== "" ? parseFloat(e.target.value) : null) === false
        ) {
          setValue((oldVal) => value);
        }
      } else {
        if (handleUpdate(e.target.value) === false) {
          setValue((oldVal) => value);
        }
      }
    }
  }

  return (
    <input
      className={`transparent ${className}`}
      type="text"
      value={value ?? ""}
      onChange={onUpdate}
      onBlur={(e) => {
        e.target.value = e.target.value.trim();
        onUpdate(e);
      }}
      maxLength={regex === numRegex ? 3 : Infinity}
      {...rest}
    />
  );
}

let lastID = 1;
function newID() {
  return lastID++;
}
function newCategory(
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

function calculateScore(categoryObj, doCap = true) {
  function calculateScoreHelper(obj, doCap) {
    const { pointsNum = obj.score ?? null, pointsDenom = 100 } = obj;
    const score = pointsNum !== null ? (pointsNum / pointsDenom) * 100 : null;

    // If leaf node, just return score
    if (obj.children === undefined) return score;

    // Otherwise, must compute score from children
    let totalWeight = 0;
    let totalSum = 0;

    const children =
      obj.dropCount !== undefined && obj.dropCount > 0
        ? markChildrenToBeDropped(obj.children, obj.dropCount).filter((c) => !c.isDropped)
        : obj.children;

    for (let child of children) {
      const score = calculateScoreHelper(child, doCap);
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

  const rawScore = calculateScoreHelper(categoryObj, doCap);
  if (rawScore === null) return null;
  if (categoryObj.capped && rawScore > 100 && doCap) return 100;
  return round(rawScore);
}

function addIDs(categoryObj) {
  if (categoryObj.id === undefined) {
    categoryObj.id = newID();
  }
  if (categoryObj.children !== undefined) {
    categoryObj.children = categoryObj.children.map((child) => addIDs(child));
  }
  return categoryObj;
}

function cleanUpBeforeSaving(categoryObj) {
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

function round(number, decimals = 2) {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
}

function flatten(categoryObj) {
  // Returns a flattened version of dataObj, i.e., all subcategories
  // are moved to the same level. Returned as array
  function flattenHelper(dataObj) {
    // If it has no weight, it doesn't count. Return empty array
    if (dataObj.weight === null || dataObj.weight === 0) return [];
    // If leaf node, then this just return this object (in an array).
    if (dataObj.children === undefined) return [{ ...dataObj, cappedCategories: [] }];

    // Otherwise, it has children. Must loop over children and add each of their
    // flattened versions into an array.

    let flattenedChildren = [];
    for (const child of dataObj.children) {
      let flattenedChild = flattenHelper(child);
      flattenedChildren.push(...flattenedChild);
    }

    // Now must normalize weights to have sum equal to dataObj's weight
    const totalWeight = flattenedChildren.reduce((total, current) => {
      if (!!current.isBonus) return total;
      return total + current.weight;
    }, 0);
    const normalized = flattenedChildren.map((descendant) => {
      const newWeight = (descendant.weight / totalWeight) * dataObj.weight;
      return { ...descendant, weight: newWeight };
    });

    const result = normalized;

    // Apply bonus if parent was bonus
    if (!!dataObj.isBonus) {
      result.forEach((c) => (c.isBonus = true));
    }

    // Update capped based on parent and existing cappedCategories array
    result.forEach((c) => {
      c.cappedCategories = c.cappedCategories.map((name) => `${dataObj.name}.${name}`);
      if (!!dataObj.capped) {
        c.cappedCategories.push(dataObj.name);
      }
    });

    return result;
  }

  const flattened = flattenHelper(categoryObj);
  return { ...categoryObj, children: flattened };
}

function markChildrenToBeDropped(childrenArray, numToDrop) {
  const scored = childrenArray
    .map((c, idx) => ({ ...c, score: calculateScore(c), idx }))
    .filter((c) => !c.isBonus && c.weight !== null && c.score !== null);

  const sorted = scored.sort((left, right) => left.score - right.score);
  const idxsToDrop = sorted.filter((c, idx) => idx < numToDrop).map((c) => c.idx);

  return childrenArray.map((c, idx) => ({ ...c, isDropped: idxsToDrop.includes(idx) }));
}

function GradeRequirement({ desiredScore, gradeData }) {
  const variables = gradeData.children.map((c) => {
    if (typeof c.pointsNum !== "number" && typeof c.score !== "number") return { ...c, score: null };
    return { ...c, score: ((c.pointsNum ?? c.score) / (c.pointsDenom ?? 100)) * 100 };
  });
  const knowns = variables.filter((item) => item.score !== null);
  const unknowns = variables.filter((item) => item.score === null);

  const [totalSoFar, totalKnownWeight] = knowns.reduce(
    ([total, totalWeight], item) => [
      total + (item.score * item.weight) / 100,
      !item.isBonus ? totalWeight + item.weight : totalWeight,
    ],
    [0, 0]
  );

  const remainingWeight = unknowns.reduce((total, current) => total + current.weight, 0);

  return (
    <>
      <div className="statistics">
        <p>
          You have earned {round(totalSoFar, 2)} out of the {round(totalKnownWeight, 2)} points possible so far, making
          your current score {totalKnownWeight !== 0 ? round((totalSoFar / totalKnownWeight) * 100) : 100}%.
        </p>
        <div>
          <ul>
            {knowns.map((known, idx) => (
              <li key={known + " " + idx}>
                {round((known.score * known.weight) / 100)} / {!known.isBonus ? round(known.weight) : 0} points from{" "}
                {known.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="requiredGrade">
        {unknowns.length === 1 ? (
          <p>
            To get a {desiredScore}% in this course, you will need to get at least a{" "}
            {round(((desiredScore - totalSoFar) / unknowns[0].weight) * 100)}% on "{unknowns[0].name}".
          </p>
        ) : unknowns.length > 1 ? (
          totalKnownWeight === 100 ? (
            <p>
              Hence, to get a {desiredScore}% in this course, you will need to get at least{" "}
              {round(desiredScore - round(totalSoFar), 2)} of the remaining {round(remainingWeight)} bonus points, which
              is an average score of {round(((desiredScore - totalSoFar) / remainingWeight) * 100)}%.
            </p>
          ) : (
            <p>
              Hence, to get a {desiredScore}% in this course, you will need to get at least{" "}
              {round(desiredScore - round(totalSoFar), 2)} of the remaining {round(remainingWeight)} points, which is an
              average score of {round(((desiredScore - totalSoFar) / remainingWeight) * 100)}%.
            </p>
          )
        ) : (
          ""
        )}
      </div>
    </>
  );
}

function Category({
  info,
  depth,
  canDelete,
  weightMode,
  isDropped = false,
  canMoveUp,
  canMoveDown,
  cbMoveSelf,
  cbDeleteSelf,
  cbAddAfterSelf,
  cbUpdateParent,
  cbSetSettingsMenu,
}) {
  const backColor = depth < depthColors.length ? depthColors[depth] : "#00FF00";
  const backColorStyle = { backgroundColor: backColor };

  const {
    name,
    weight,
    pointsNum = info.score ?? null,
    pointsDenom = 100,
    children,
    capped = false,
    isBonus = false,
    childrenWeightMode = ChildrenWeightModes.CUSTOMIZABLE,
    dropCount = 0,
  } = info;
  const [hidden, setHidden] = useState(false);
  const [settingsNeedUpdated, setSettingsNeedUpdated] = useState(false);

  const isLeaf = info.children === undefined;
  const isRoot = depth < 0;
  const shouldShowChildren = isRoot || (!isLeaf && !hidden);
  const canHaveChildren = depth < depthColors.length - 1;
  const canDeleteSelf = depth > 0 || canDelete;

  let scoreIgnoreCap = calculateScore(info, false);

  let scoreText = "";
  if (isLeaf) {
    scoreText = scoreIgnoreCap === null ? "N/A" : `${scoreIgnoreCap}%`;
  } else if (scoreIgnoreCap === null) {
    scoreText = "N/A";
  } else if (scoreIgnoreCap > 100) {
    scoreText = capped ? "100%" : `${scoreIgnoreCap}%`;
  } else {
    scoreText = `${scoreIgnoreCap}%`;
  }

  let pointsText = pointsNum;
  if (!isLeaf) {
    const multiplier = parseFloat(scoreText);
    pointsText = multiplier || multiplier === 0 ? round((multiplier * weight) / 100) : "?";
  }

  const handleFieldsChange = useCallback(
    (fieldDictionary) => {
      const infoCopy = { ...info };
      for (const key of Object.keys(fieldDictionary)) {
        infoCopy[key] = fieldDictionary[key];
      }
      cbUpdateParent(infoCopy);
    },
    [info, cbUpdateParent]
  );

  function deleteChild(idx) {
    if (children.length === 1) {
      handleFieldsChange({
        pointsNum: null,
        pointsDenom: 100,
        children: undefined,
        dropCount: undefined,
        weight: weightMode === ChildrenWeightModes.POINT_BASED ? 100 : weight,
      });
    } else {
      // Must handle case of deleting only non-bonus
      const nonBonus1 = children.findIndex((child) => !!child.isBonus === false);
      const nonBonus2 = children.findLastIndex((child) => !!child.isBonus === false);
      if (nonBonus1 === nonBonus2 && nonBonus2 === idx) {
        alert("You cannot delete the only non-bonus item within this category!");
        return;
      }
      handleFieldsChange({ children: ArrayUtil.deleteFromArray(children, idx) });
    }
  }

  const handleWeightModeChange = useCallback(
    (newValue) => {
      switch (newValue) {
        case ChildrenWeightModes.CUSTOMIZABLE:
          handleFieldsChange({
            childrenWeightMode: newValue,
            dropCount: undefined,
          });
          break;
        case ChildrenWeightModes.FORCED_EQUAL:
          handleFieldsChange({
            children: children.map((c) => (c.isBonus ? c : { ...c, weight: 1 })),
            childrenWeightMode: newValue,
          });
          break;
        case ChildrenWeightModes.POINT_BASED:
          handleFieldsChange({
            children: children.map((c) => ({ ...c, weight: c.pointsDenom ?? c.weight })),
            childrenWeightMode: newValue,
          });
          break;
        default:
          console.log("Invalid weight mode: " + newValue);
          break;
      }
    },
    [children, handleFieldsChange]
  );

  useEffect(() => {
    if (settingsNeedUpdated)
      cbSetSettingsMenu(
        <div className="settingsMenu" onClick={(e) => e.stopPropagation()}>
          <h3>{name} Settings</h3>
          <div>
            <button
              onClick={() => {
                if (isBonus) {
                  let newWeight = weight;
                  if (weightMode === ChildrenWeightModes.FORCED_EQUAL) {
                    newWeight = 1;
                  } else if (weightMode === ChildrenWeightModes.POINT_BASED) {
                    newWeight = pointsDenom;
                  }
                  handleFieldsChange({ isBonus: false, weight: newWeight });
                } else {
                  handleFieldsChange({ isBonus: true });
                }
                setSettingsNeedUpdated(true);
              }}
            >
              {!!isBonus ? "Undo Bonus Assignment" : "Make Bonus Assignment"}
            </button>
          </div>
          <div>
            <button
              disabled={!canHaveChildren}
              onClick={() => {
                const newChildren = children === undefined ? [newCategory()] : [...children, newCategory()];
                handleFieldsChange({
                  score: undefined,
                  children: newChildren,
                });
                setSettingsNeedUpdated(true);
              }}
            >
              Add Child Category
            </button>
          </div>
          <div>
            <button
              title="Add Children"
              disabled={!canHaveChildren}
              onClick={() => {
                let count = prompt("How many children would you like to add?")?.trim();
                if (!count || isNaN(count)) return;
                count = Math.floor(parseFloat(count));
                if (count <= 0) return;
                let name = prompt("What should their name be? (Will be named by 'name #')")?.trim();
                if (!name) return;
                const newCategories = [...Array(count).keys()].map((i) => ({
                  ...newCategory(),
                  name: `${name} ${i + 1}`,
                }));
                const newChildren = children === undefined ? newCategories : [...children, ...newCategories];
                handleFieldsChange({
                  score: undefined,
                  children: newChildren,
                });
                cbSetSettingsMenu(null);
              }}
            >
              Add Multiple Child Categories
            </button>
          </div>
          {!isLeaf && (
            <>
              <div>
                <button
                  onClick={() => {
                    setHidden((prev) => !prev);
                    setSettingsNeedUpdated(true);
                  }}
                >
                  {hidden ? "Show" : "Hide"} Children
                </button>
              </div>
              <div>
                Children Weights:{" "}
                <select
                  onChange={(e) => {
                    handleWeightModeChange(e.target.value);
                    setSettingsNeedUpdated(true);
                  }}
                  value={childrenWeightMode}
                >
                  <option value={ChildrenWeightModes.CUSTOMIZABLE}>Customizable</option>
                  <option value={ChildrenWeightModes.FORCED_EQUAL}>Forced Equal</option>
                  <option value={ChildrenWeightModes.POINT_BASED}>Point-Based</option>
                </select>
              </div>
              <div>
                <button
                  disabled={childrenWeightMode !== ChildrenWeightModes.FORCED_EQUAL}
                  onClick={() => {
                    let count = prompt("How many should be dropped?")?.trim();
                    if (count && !isNaN(count)) {
                      count = Math.ceil(parseFloat(count));
                      if (count <= 0) count = undefined;
                    } else {
                      count = undefined;
                    }
                    handleFieldsChange({ dropCount: count });
                    setSettingsNeedUpdated(true);
                  }}
                >
                  Drop Assignments
                  {childrenWeightMode === ChildrenWeightModes.FORCED_EQUAL && dropCount ? `: ${dropCount}` : ""}
                </button>
              </div>
            </>
          )}
        </div>
      );
    setSettingsNeedUpdated(false);
  }, [
    cbSetSettingsMenu,
    settingsNeedUpdated,
    canHaveChildren,
    children,
    childrenWeightMode,
    dropCount,
    handleFieldsChange,
    handleWeightModeChange,
    hidden,
    isBonus,
    isLeaf,
    name,
    weight,
    weightMode,
    pointsDenom,
  ]);

  const markedChildren = !isLeaf && dropCount > 0 ? markChildrenToBeDropped(children, dropCount) : children;

  return (
    <>
      {!isRoot && (
        <tr style={backColorStyle}>
          <td className="gradeName">
            <SmartInput
              initValue={name}
              regex={alphaNumRegex}
              handleUpdate={(newVal) => handleFieldsChange({ name: newVal })}
              style={{ textDecoration: isDropped ? "line-through" : "none" }}
            />
          </td>
          <td className="gradeWeight">
            <SmartInput
              className="weight"
              disabled={
                (weightMode === ChildrenWeightModes.POINT_BASED && isLeaf) ||
                (weightMode === ChildrenWeightModes.FORCED_EQUAL && !isBonus)
              }
              regex={numRegex}
              numeric
              initValue={weight}
              handleUpdate={(newVal) => {
                handleFieldsChange({ weight: newVal });
              }}
              style={{ color: isBonus ? "lime" : "inherit" }}
            />
          </td>
          <td className="gradePoints">
            {isLeaf ? (
              <>
                <SmartInput
                  className="score"
                  regex={numRegex}
                  numeric
                  initValue={pointsNum}
                  handleUpdate={(newVal) => handleFieldsChange({ pointsNum: newVal })}
                />
                /
                <SmartInput
                  className="score"
                  regex={numRegex}
                  numeric
                  initValue={pointsDenom}
                  placeholder={100}
                  handleUpdate={(newVal) => {
                    const newPointsDenom = newVal <= 0 ? 100 : newVal;
                    if (weightMode === ChildrenWeightModes.POINT_BASED) {
                      handleFieldsChange({ pointsDenom: newPointsDenom, weight: newPointsDenom });
                    } else {
                      handleFieldsChange({ pointsDenom: newPointsDenom });
                    }
                  }}
                />
              </>
            ) : (
              <div style={{ fontWeight: "bold" }}>{`${pointsText} / ${weight ?? 0}`}</div>
            )}
          </td>
          <td className="gradeScore">{scoreText}</td>
          <td>
            <div className="gradeRowButtons">
              <div className="upDownButtons">
                <button className="iconButton" title="Move Up" disabled={!canMoveUp} onClick={() => cbMoveSelf(-1)}>
                  <UpIcon />
                </button>
                <button className="iconButton" title="Move Down" disabled={!canMoveDown} onClick={() => cbMoveSelf(1)}>
                  <DownIcon />
                </button>
              </div>
              <button className="iconButton" title="Add Category" onClick={cbAddAfterSelf}>
                <PlusIcon />
              </button>
              <button className="iconButton" title="Delete" disabled={!canDeleteSelf} onClick={() => cbDeleteSelf()}>
                <DeleteIcon />
              </button>
              <button className="iconButton" title="Open Settings" onClick={() => setSettingsNeedUpdated(true)}>
                <SettingsIcon />
              </button>
            </div>
          </td>
        </tr>
      )}
      {shouldShowChildren && (
        <>
          {markedChildren.map((c, idx) => (
            <Category
              key={c.id}
              info={c}
              depth={depth + 1}
              weightMode={childrenWeightMode}
              canMoveUp={idx > 0}
              canMoveDown={idx < children.length - 1}
              canDelete={children.length > 1 || depth > 0}
              isDropped={c.isDropped}
              cbMoveSelf={(dir) => {
                handleFieldsChange({ children: ArrayUtil.swapInArray(children, idx, idx + dir) });
              }}
              cbDeleteSelf={() => deleteChild(idx)}
              cbAddAfterSelf={() =>
                handleFieldsChange({ children: ArrayUtil.addToArray(children, idx, newCategory()) })
              }
              cbUpdateParent={(newData) =>
                handleFieldsChange({ children: ArrayUtil.replaceInArray(children, idx, newData) })
              }
              cbSetSettingsMenu={cbSetSettingsMenu}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function Course({ loggedIn }) {
  const { title } = useParams();

  const [gradeData, setGradeData] = useState({});
  const [currTitle, setCurrTitle] = useState(title);
  const [desiredScore, setDesiredScore] = useState(null);

  const [loaded, setLoaded] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState(null);
  const navigate = useNavigate();

  function getCourse() {
    StorageAPI.getCourse(title, loggedIn)
      .then((course) => {
        setCurrTitle(course.title);
        setGradeData(course.root);
        setDesiredScore(course.desiredScore);
        setLoaded(true);
      })
      .catch((err) => {
        // Invalid course name, go back to list
        alert(err.message);
        navigate(`/courses`, { replace: true });
      });
  }

  function saveCourse(originalTitle, data) {
    StorageAPI.updateCourse(originalTitle, data, loggedIn)
      .then(() => {
        alert("Changes saved successfully!");
        navigate(`/courses/${data.title}`, { replace: true });
      })
      .catch((err) => alert(err.message));
  }

  function deleteCourse(title) {
    StorageAPI.deleteCourse(title, loggedIn)
      .then(() => navigate(`/courses`, { replace: true }))
      .catch((err) => alert(err.message));
  }

  useEffect(getCourse, [loggedIn, navigate, title]);

  if (!loaded) return "";

  const flattenedData = flatten(gradeData);
  const scoreTextIgnoreCap = calculateScore(gradeData, false);
  const scoreText =
    scoreTextIgnoreCap === null ? "N/A" : scoreTextIgnoreCap > 100 && gradeData.capped ? 100 : scoreTextIgnoreCap;

  return (
    <AuthenticatedPage initiallyLoggedIn={loggedIn}>
      <div className="courseContainer">
        <h1>
          Course Title:{" "}
          <input
            className="courseTitle"
            type="text"
            value={currTitle}
            onChange={(e) => setCurrTitle(e.target.value)}
            onBlur={(e) => setCurrTitle(e.target.value.trim())}
          />
        </h1>
        <h2
          className="courseScore"
          onClick={() => setGradeData((data) => ({ ...data, capped: !data.capped }))}
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          {`Score: ${scoreText}`}{" "}
          <span>{scoreTextIgnoreCap !== null && scoreTextIgnoreCap > 100 && gradeData.capped ? "(Capped)" : ""}</span>
        </h2>

        <table className="courseTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Weight</th>
              <th>Points</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <Category
              info={addIDs(gradeData)}
              depth={-1}
              cbUpdateParent={(newData) => {
                setGradeData(newData);
              }}
              cbSetSettingsMenu={setSettingsMenu}
            />
          </tbody>
        </table>
      </div>
      <div className="scoreButtonContainer">
        <div className="desiredScore">
          Desired Score:{" "}
          <input
            type="number"
            value={desiredScore ?? ""}
            onChange={(e) => {
              setDesiredScore(e.target.value === "" ? null : parseFloat(e.target.value));
            }}
          />
        </div>
        <div className="manageButtons">
          <button
            onClick={() => {
              saveCourse(title, {
                title: currTitle,
                root: cleanUpBeforeSaving(gradeData),
                desiredScore: desiredScore,
              });
            }}
          >
            Save Changes
          </button>
          <button onClick={() => deleteCourse(title)}>Delete Course</button>
        </div>
      </div>
      <GradeRequirement desiredScore={desiredScore} gradeData={flattenedData} />
      {!!settingsMenu && (
        <div className="darkOverlay" onClick={() => setSettingsMenu(null)}>
          {settingsMenu}
        </div>
      )}
    </AuthenticatedPage>
  );
}
