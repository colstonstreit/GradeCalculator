import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as ArrayUtil from "../lib/arrayUtil";
import NetworkAPI from "../lib/networkAPI";
import StorageAPI from "../lib/storageAPI";
import AuthenticatedPage from "./AuthenticatedPage";

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
      {...rest}
    />
  );
}

function Category({
  info,
  depth,
  canDelete,
  canBeBonus,
  weightFixed,
  isOnlyNonBonus,
  canMoveUp,
  canMoveDown,
  cbMoveSelf,
  cbDeleteSelf,
  cbAddAfterSelf,
  cbUpdateParent,
}) {
  const backColor = depth < depthColors.length ? depthColors[depth] : "#00FF00";
  const backColorStyle = { backgroundColor: backColor };

  const {
    name,
    weight,
    score,
    children,
    capped = false,
    isBonus = false,
    childrenWeightFixed = false,
    dropCount = 0,
  } = info;
  const [hidden, setHidden] = useState(false);

  const isLeaf = info.children === undefined;
  const isRoot = depth < 0;
  const shouldShowChildren = isRoot || (!isLeaf && !hidden);
  const canHaveChildren = depth < depthColors.length - 1;
  const canDeleteSelf = depth > 0 || canDelete;

  const scoreTextIgnoreCap = isLeaf ? score ?? "" : calculateScore(info, false);
  const scoreText =
    typeof scoreTextIgnoreCap === "string"
      ? scoreTextIgnoreCap
      : scoreTextIgnoreCap > 100 && capped
      ? 100
      : scoreTextIgnoreCap;

  function deleteChild(idx) {
    if (children.length === 1) {
      handleFieldsChange(["score", "children", "dropCount"], [null, undefined, undefined]);
    } else {
      // Must handle case of deleting only non-bonus
      const nonBonus1 = children.findIndex((child) => !!child.isBonus === false);
      const nonBonus2 = children.findLastIndex((child) => !!child.isBonus === false);
      if (nonBonus1 === nonBonus2 && nonBonus2 === idx) {
        alert("You cannot delete the only non-bonus item within this category!");
        return;
      }
      handleFieldsChange(["children"], [ArrayUtil.deleteFromArray(children, idx)]);
    }
  }

  function handleFieldsChange(fields, newValues) {
    const infoCopy = { ...info };
    for (let i = 0; i < fields.length; i++) {
      infoCopy[fields[i]] = newValues[i];
    }
    cbUpdateParent(infoCopy);
  }

  function handleToggleFixChildrenWeights() {
    if (!childrenWeightFixed) {
      handleFieldsChange(
        ["children", "childrenWeightFixed"],
        [children.map((c) => ({ ...newCategory(c), weight: 1 })), true]
      );
    } else {
      handleFieldsChange(["childrenWeightFixed", "dropCount"], [false, undefined]);
    }
  }

  return (
    <>
      {!isRoot && (
        <>
          <div className="gradeRow" style={backColorStyle}>
            <div className="gradeRowContentWrapper inline">
              <div className="gradeName inline">
                Name:{" "}
                <SmartInput
                  initValue={name}
                  regex={alphaNumRegex}
                  handleUpdate={(newVal) => handleFieldsChange(["name"], [newVal])}
                />
              </div>
              <div className="gradeWeight inline">
                Weight:{" "}
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
                    handleFieldsChange(["weight"], [newVal]);
                  }}
                />
              </div>
              {isLeaf && (
                <div className="gradeScore inline">
                  Score:{" "}
                  <SmartInput
                    className="score"
                    regex={numRegex}
                    numeric
                    initValue={score}
                    handleUpdate={(newVal) => handleFieldsChange(["score"], [newVal])}
                  />
                </div>
              )}
              {!isLeaf && (
                <div className="gradeScoreAuto">
                  <span onClick={() => handleFieldsChange(["capped"], [!capped])} style={{ cursor: "pointer" }}>
                    Score{" "}
                    {typeof scoreTextIgnoreCap === "number" && scoreTextIgnoreCap > 100
                      ? capped
                        ? "(Capped):"
                        : "(Uncapped):"
                      : ":"}
                  </span>
                  <input className="score transparent" disabled type="text" value={scoreText} />
                </div>
              )}
              <div className="gradeRowButtons">
                <button
                  title="Toggle Bonus"
                  disabled={!canBeBonus}
                  onClick={() => handleFieldsChange(["isBonus"], [!isBonus])}
                >
                  {!!isBonus ? "UB" : "MB"}
                </button>

                <button
                  title="Toggle Fixed Children Weights"
                  disabled={isLeaf}
                  onClick={handleToggleFixChildrenWeights}
                >
                  FW
                </button>

                <button
                  title="Choose How Many to Drop (must be equally weighted)"
                  disabled={isLeaf || !childrenWeightFixed}
                  onClick={() => {
                    let count = prompt("How many should be dropped?")?.trim();
                    if (count && !isNaN(count)) {
                      count = Math.ceil(parseFloat(count));
                      if (count <= 0) count = undefined;
                    } else {
                      count = undefined;
                    }
                    handleFieldsChange(["dropCount"], [count]);
                  }}
                >
                  Drop {childrenWeightFixed && dropCount ? `: ${dropCount}` : ""}
                </button>

                <button title="Toggle Children Visibility" disabled={isLeaf} onClick={() => setHidden((prev) => !prev)}>
                  {hidden ? "Show" : "Hide"}
                </button>

                <button title="Move Up" disabled={!canMoveUp} onClick={() => cbMoveSelf(-1)}>
                  U
                </button>
                <button title="Move Down" disabled={!canMoveDown} onClick={() => cbMoveSelf(1)}>
                  D
                </button>
                <button title="Delete" disabled={!canDeleteSelf} onClick={() => cbDeleteSelf()}>
                  X
                </button>
                <button title="Add Category" onClick={cbAddAfterSelf}>
                  +
                </button>
                <button
                  title="Add Child"
                  disabled={!canHaveChildren}
                  onClick={() => {
                    const newChildren = children === undefined ? [newCategory()] : [...children, newCategory()];
                    handleFieldsChange(["score", "children"], [undefined, newChildren]);
                  }}
                >
                  +C
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
                    handleFieldsChange(["score", "children"], [undefined, newChildren]);
                  }}
                >
                  ++C
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {shouldShowChildren && (
        <div className="gradeChildren">
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
                handleFieldsChange(["children"], [ArrayUtil.swapInArray(children, idx, idx + dir)]);
              }}
              cbDeleteSelf={() => deleteChild(idx)}
              cbAddAfterSelf={() =>
                handleFieldsChange(["children"], [ArrayUtil.addToArray(children, idx, newCategory())])
              }
              cbUpdateParent={(newData) =>
                handleFieldsChange(["children"], [ArrayUtil.replaceInArray(children, idx, newData)])
              }
            />
          ))}
        </div>
      )}
    </>
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
  // If leaf node, just return score
  if (categoryObj.children === undefined) return categoryObj.score ?? "N/A";

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

export default function Course({ loggedIn }) {
  const { title } = useParams();

  const [gradeData, setGradeData] = useState({});
  const [currTitle, setCurrTitle] = useState(title);
  const [desiredScore, setDesiredScore] = useState(null);

  const [loaded, setLoaded] = useState(false);

  function saveCourse(originalTitle, data) {
    StorageAPI.updateCourse(originalTitle, data, loggedIn)
      .then(() => (window.location.href = `/courses/${data.title}`))
      .catch((err) => alert(err.message));
  }

  function deleteCourse(title) {
    StorageAPI.deleteCourse(title, loggedIn)
      .then(() => window.location.replace(`/courses`))
      .catch((err) => alert(err.message));
  }

  useEffect(() => {
    function getCourse() {
      StorageAPI.getCourse(title, loggedIn)
        .then((course) => {
          setCurrTitle(course.title);
          setGradeData(addIDs(course.root));
          setDesiredScore(course.desiredScore);
          setLoaded(true);
        })
        .catch((err) => {
          // Invalid course name, go back to list
          alert(err.message);
          window.location.replace("/courses");
        });
    }
    getCourse();
  }, [title, loggedIn]);

  if (!loaded) return "";

  const flattenedData = flatten(gradeData);
  const scoreTextIgnoreCap = calculateScore(gradeData, false);
  const scoreText =
    scoreTextIgnoreCap === "N/A" ? "N/A" : scoreTextIgnoreCap > 100 && gradeData.capped ? 100 : scoreTextIgnoreCap;

  return (
    <AuthenticatedPage initiallyLoggedIn={loggedIn}>
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
      <Category
        info={gradeData}
        depth={-1}
        cbUpdateParent={(newData) => {
          setGradeData(newData);
        }}
      />
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
    </AuthenticatedPage>
  );
}
