import React, { useState } from "react";
import { useParams } from "react-router-dom";
import * as Util from "../util";

const numRegex = /^([0-9]+((\.)|(\.[0-9]{0,3}))?)?$/;
const alphaNumRegex = /^([0-9a-zA-z ]){0,20}$/;
const depthColors = ["#777", "#AAA", "#DDD", "#FFF"];

function SmartInput({
  regex,
  numeric,
  initValue = "",
  handleUpdate,
  className = "",
}) {
  const [value, setValue] = useState(initValue);

  function onUpdate(e) {
    if (regex.test(e.target.value)) {
      setValue(e.target.value);
      if (numeric) {
        handleUpdate(
          !isNaN(e.target.value) && e.target.value !== ""
            ? parseFloat(e.target.value)
            : null
        );
      } else {
        handleUpdate(e.target.value);
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
    />
  );
}

function Category({
  info,
  depth,
  canDelete,
  canMoveUp,
  canMoveDown,
  cbMoveSelf,
  cbDeleteSelf,
  cbAddAfterSelf,
  cbUpdateParent,
}) {
  const backColor = depth < depthColors.length ? depthColors[depth] : "#00FF00";
  const backColorStyle = { backgroundColor: backColor };

  const { name, weight, score, children } = info;
  const [hidden, setHidden] = useState(false);

  const isLeaf = info.children === undefined;
  const scoreText = isLeaf ? score ?? "" : calculateScore(children);

  function deleteChild(idx) {
    if (children.length === 1) {
      handleFieldsChange(["score", "children"], [null, undefined]);
    } else {
      handleFieldsChange(["children"], [Util.deleteFromArray(children, idx)]);
    }
  }

  function handleFieldsChange(fields, newValues) {
    const infoCopy = { ...info };
    for (let i = 0; i < fields.length; i++) {
      infoCopy[fields[i]] = newValues[i];
    }
    cbUpdateParent(infoCopy);
  }

  return (
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
              regex={numRegex}
              numeric
              initValue={weight}
              handleUpdate={(newVal) =>
                handleFieldsChange(["weight"], [newVal])
              }
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
                handleUpdate={(newVal) =>
                  handleFieldsChange(["score"], [newVal])
                }
              />
            </div>
          )}
          {!isLeaf && (
            <div className="gradeScoreAuto">
              Score:{" "}
              <input
                className="score transparent"
                disabled
                type="text"
                value={scoreText}
              />
            </div>
          )}
          <div className="gradeRowButtons">
            {!isLeaf && (
              <button onClick={() => setHidden((prev) => !prev)}>
                {hidden ? "Show" : "Hide"}
              </button>
            )}
            {depth < depthColors.length - 1 && (
              <button
                onClick={() => {
                  const newChildren =
                    children === undefined
                      ? [newCategory()]
                      : [...children, newCategory()];
                  handleFieldsChange(
                    ["score", "children"],
                    [undefined, newChildren]
                  );
                }}
              >
                Add Sub
              </button>
            )}
            {canMoveUp && <button onClick={() => cbMoveSelf(-1)}>Up</button>}
            {canMoveDown && <button onClick={() => cbMoveSelf(1)}>Down</button>}
            {(depth > 0 || canDelete) && (
              <button onClick={() => cbDeleteSelf()}>X</button>
            )}
            <button onClick={cbAddAfterSelf}>+</button>
          </div>
        </div>
      </div>
      {!isLeaf && !hidden && (
        <div className="gradeChildren">
          {children.map((c, idx) => (
            <Category
              key={c.id}
              info={c}
              depth={depth + 1}
              canMoveUp={idx > 0}
              canMoveDown={idx < children.length - 1}
              cbMoveSelf={(dir) => {
                handleFieldsChange(
                  ["children"],
                  [Util.swapInArray(children, idx, idx + dir)]
                );
              }}
              cbDeleteSelf={() => deleteChild(idx)}
              cbAddAfterSelf={() =>
                handleFieldsChange(
                  ["children"],
                  [Util.addToArray(children, idx, newCategory())]
                )
              }
              cbUpdateParent={(newData) =>
                handleFieldsChange(
                  ["children"],
                  [Util.replaceInArray(children, idx, newData)]
                )
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
function newCategory() {
  const id = newID();
  return {
    name: `Item ${id}`,
    weight: 1,
    score: null,
    id: id,
  };
}

function calculateScore(children) {
  let totalWeight = 0;
  let totalSum = 0;
  for (let child of children) {
    const isLeaf = child.children === undefined;
    if (isLeaf && child.score !== null && child.weight !== null) {
      totalWeight += child.weight;
      totalSum += child.weight * child.score;
    } else if (!isLeaf && child.weight !== null) {
      const score = calculateScore(child.children);
      if (score !== "N/A") {
        totalWeight += child.weight;
        totalSum += child.weight * score;
      }
    }
  }
  if (totalWeight === 0) return "N/A";
  return Math.round((totalSum / totalWeight) * 100) / 100;
}

function addIDs(children) {
  for (let child of children) {
    if (child.id === undefined) {
      child.id = newID();
      if (child.children !== undefined) {
        addIDs(child.children);
      }
    }
  }
  return children;
}

function getChildrenWithoutIDs(children) {
  const childrenCopy = Util.createDeepCopy(children);
  for (let child of childrenCopy) {
    if (child.id !== undefined) {
      delete child.id;
      if (child.children !== undefined) {
        child.children = getChildrenWithoutIDs(child.children);
      }
    }
  }
  return childrenCopy;
}

function saveDataToDatabase(originalTitle, courseIndex, data) {
  console.log("Original Title:", originalTitle);
  console.log("Course Index:", courseIndex);
  console.log("New Data:", data);
}

export default function Course({ user }) {
  const { title } = useParams();
  const courseIndex = user.courses.findIndex(
    (course) => course.title === title
  );
  const courseInfo = user.courses[courseIndex];

  const [gradeData, setGradeData] = useState(addIDs(courseInfo.categories));
  const [currTitle, setCurrTitle] = useState(title);
  const scoreText = calculateScore(gradeData);

  return (
    <>
      <main className="courseContainer">
        <h1>
          Course Title:{" "}
          <input
            type="text"
            value={currTitle}
            onChange={(e) => setCurrTitle(e.target.value)}
            onBlur={(e) => setCurrTitle(e.target.value.trim())}
          />
        </h1>
        <h2 className="courseScore">{`Score: ${scoreText}`}</h2>
        {gradeData.map((c, idx) => (
          <Category
            key={c.id}
            info={c}
            depth={0}
            canDelete={gradeData.length > 1}
            canMoveUp={idx > 0}
            canMoveDown={idx < gradeData.length - 1}
            cbMoveSelf={(dir) =>
              setGradeData(Util.swapInArray(gradeData, idx, idx + dir))
            }
            cbDeleteSelf={() =>
              setGradeData(Util.deleteFromArray(gradeData, idx))
            }
            cbAddAfterSelf={() =>
              setGradeData(Util.addToArray(gradeData, idx, newCategory()))
            }
            cbUpdateParent={(newData) =>
              setGradeData(Util.replaceInArray(gradeData, idx, newData))
            }
          />
        ))}
        <button
          onClick={() => {
            saveDataToDatabase(title, courseIndex, {
              title: currTitle,
              categories: getChildrenWithoutIDs(gradeData),
            });
          }}
        >
          Save Changes
        </button>
      </main>
    </>
  );
}
