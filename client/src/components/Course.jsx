import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as ArrayUtil from "../lib/arrayUtil";
import StorageAPI from "../lib/storageAPI";
import AuthenticatedPage from "./AuthenticatedPage";
import { DeleteIcon, DownIcon, PlusIcon, SettingsIcon, UpIcon } from "./Icons";

const numRegex = /^([0-9]+((\.)|(\.[0-9]{0,3}))?)?$/;
const alphaNumRegex = /^([0-9a-zA-z ]){0,20}$/;
const depthColors = ["#777", "#AAA", "#DDD", "#FFF"];

function SmartInput({ regex, numeric, initValue = "", handleUpdate, className = "", ...rest }) {
  const [value, setValue] = useState(initValue);

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
    score: null,
  }
) {
  const id = newID();
  return {
    ...initial,
    id: id,
  };
}

function calculateScore(categoryObj, doCap = true) {
  const { pointsNum = categoryObj.score ?? null, pointsDenom = 100 } = categoryObj;
  const score = pointsNum !== null ? (pointsNum / pointsDenom) * 100 : "N/A";

  // If leaf node, just return score
  if (categoryObj.children === undefined) return score ?? "N/A";

  // Otherwise, must compute score from children
  let totalWeight = 0;
  let totalSum = 0;

  for (let child of categoryObj.children) {
    const score = calculateScore(child);
    if (score !== "N/A") {
      if (!child.isBonus) {
        totalWeight += child.weight;
      }
      totalSum += child.weight * score;
    }
  }
  if (totalWeight === 0) return "N/A";

  const computedScore = round(totalSum / totalWeight);
  if (categoryObj.capped && computedScore > 100 && doCap) return 100;
  return computedScore;
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

function removeIDs(categoryObj) {
  if (categoryObj.id !== undefined) {
    delete categoryObj.id;
  }
  if (categoryObj.children !== undefined) {
    categoryObj.children = categoryObj.children.map((child) => removeIDs(child));
  }
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

function GradeRequirement({ desiredScore, gradeData }) {
  const variables = gradeData.children;
  const knowns = variables.filter((item) => item.score !== null);
  const unknowns = variables.filter((item) => item.score === null);

  const [totalSoFar, totalKnownWeight] = knowns.reduce(
    ([total, totalWeight], item) => [
      total + (item.score * item.weight) / 100,
      !item.isBonus ? totalWeight + item.weight : totalWeight,
    ],
    [0, 0]
  );

  // TODO: Generate some kind of data structure that contains constraints (caps)
  //       and use it to compute the results below as well as for graphing later
  //       Should have some kind of evaluate function that plugs missing values in

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
  canBeBonus,
  weightFixed,
  isOnlyNonBonus,
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
    childrenWeightFixed = false,
    dropCount = 0,
  } = info;
  const [hidden, setHidden] = useState(false);
  const [settingsNeedUpdated, setSettingsNeedUpdated] = useState(false);

  const isLeaf = info.children === undefined;
  const isRoot = depth < 0;
  const shouldShowChildren = isRoot || (!isLeaf && !hidden);
  const canHaveChildren = depth < depthColors.length - 1;
  const canDeleteSelf = depth > 0 || canDelete;

  let scoreIgnoreCap = "N/A";
  if (isLeaf) {
    scoreIgnoreCap = pointsNum !== null ? round((pointsNum / pointsDenom) * 100) : "N/A";
  } else {
    scoreIgnoreCap = calculateScore(info, false);
  }

  let scoreText = "";
  if (isLeaf) {
    scoreText = typeof scoreIgnoreCap === "string" ? "N/A" : `${scoreIgnoreCap}%`;
  } else if (typeof scoreIgnoreCap === "string") {
    scoreText = scoreIgnoreCap;
  } else if (scoreIgnoreCap > 100) {
    scoreText = capped ? "100%" : `${scoreIgnoreCap}%`;
  } else {
    scoreText = `${scoreIgnoreCap}%`;
  }

  let pointsText = pointsNum;
  if (!isLeaf) {
    const multiplier = parseFloat(scoreText);
    pointsText = multiplier ? round((multiplier * weight) / 100) : "?";
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
        score: null,
        children: undefined,
        dropCount: undefined,
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

  const handleToggleFixChildrenWeights = useCallback(() => {
    if (!childrenWeightFixed) {
      handleFieldsChange({
        children: children.map((c) => ({ ...newCategory(c), weight: 1 })),
        childrenWeightFixed: true,
      });
    } else {
      handleFieldsChange({
        childrenWeightFixed: false,
        dropCount: undefined,
      });
    }
  }, [children, childrenWeightFixed, handleFieldsChange]);

  useEffect(() => {
    if (settingsNeedUpdated)
      cbSetSettingsMenu(
        <div className="settingsMenu" onClick={(e) => e.stopPropagation()}>
          <h3>{name} Settings</h3>
          <button
            disabled={!canBeBonus}
            onClick={() => {
              handleFieldsChange({ isBonus: !isBonus });
              setSettingsNeedUpdated(true);
            }}
          >
            {!!isBonus ? "Undo Bonus Assignment" : "Make Bonus Assignment"}
          </button>
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
              setSettingsNeedUpdated(true);
            }}
          >
            Add Multiple Child Categories
          </button>
          {!isLeaf && (
            <>
              <button
                onClick={() => {
                  setHidden((prev) => !prev);
                  setSettingsNeedUpdated(true);
                }}
              >
                {hidden ? "Show" : "Hide"} Children
              </button>
              <button
                onClick={() => {
                  handleToggleFixChildrenWeights();
                  setSettingsNeedUpdated(true);
                }}
              >
                {childrenWeightFixed ? "Allow Children Weights to Vary" : "Force Children Weights Equal"}
              </button>
              <button
                disabled={!childrenWeightFixed}
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
                Drop Assignments{childrenWeightFixed && dropCount ? `: ${dropCount}` : ""}
              </button>
            </>
          )}
        </div>
      );
    setSettingsNeedUpdated(false);
  }, [
    cbSetSettingsMenu,
    settingsNeedUpdated,
    canBeBonus,
    canHaveChildren,
    children,
    childrenWeightFixed,
    dropCount,
    handleFieldsChange,
    handleToggleFixChildrenWeights,
    hidden,
    isBonus,
    isLeaf,
    name,
  ]);

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
              disabled={weightFixed}
              regex={numRegex}
              numeric
              initValue={weight}
              handleUpdate={(newVal) => {
                if ((newVal === null || newVal === 0) && isOnlyNonBonus) {
                  // Must handle case of deleting only non-bonus
                  alert("You cannot delete the weight of the only non-bonus item in the category!");
                  return false;
                }
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
                    handleFieldsChange({ pointsDenom: newVal <= 0 ? 100 : newVal });
                  }}
                />
              </>
            ) : (
              `${pointsText} / ${weight ?? 0}`
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
          {children.map((c, idx) => (
            <Category
              key={c.id}
              info={c}
              depth={depth + 1}
              weightFixed={childrenWeightFixed}
              canMoveUp={idx > 0}
              canMoveDown={idx < children.length - 1}
              canDelete={children.length > 1 || depth > 0}
              canBeBonus={
                children.find((child) => !child.isBonus && child.weight !== null && child.weight > 0 && child !== c) !==
                undefined
              }
              isOnlyNonBonus={
                idx === children.findIndex((c) => !c.isBonus && c.weight !== null && c.weight > 0) &&
                idx === children.findLastIndex((c) => !c.isBonus && c.weight !== null && c.weight > 0)
              }
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
    scoreTextIgnoreCap === "N/A" ? "N/A" : scoreTextIgnoreCap > 100 && gradeData.capped ? 100 : scoreTextIgnoreCap;

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
          <span>
            {typeof scoreTextIgnoreCap === "number" && scoreTextIgnoreCap > 100
              ? gradeData.capped
                ? "(Capped)"
                : "(Uncapped)"
              : ""}
          </span>
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
                root: removeIDs(gradeData),
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