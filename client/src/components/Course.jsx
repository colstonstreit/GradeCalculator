import React, { useState, useEffect } from "react";
import { json, Link, useParams } from "react-router-dom";

let lastID = 1;

function newCategory() {
  return {
    name: `Placeholder${lastID++}`,
    weight: 1,
    score: null,
  };
}

function createJSONObject(
  name,
  weight,
  score = undefined,
  children = undefined
) {
  let obj = { name: name, weight: weight };
  if (score !== undefined) obj.score = score;
  if (children !== undefined) obj.children = children;
  return obj;
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
      totalWeight += child.weight;
      totalSum += child.weight * calculateScore(child.children);
    }
  }
  if (totalWeight === 0) return "N/A";
  return Math.round((totalSum / totalWeight) * 100) / 100;
}

function SmartInput({ regex, initValue = "", handleUpdate, className = "" }) {
  const [value, setValue] = useState(initValue);
  return (
    <input
      className={`transparent ${className}`}
      type="text"
      value={value ?? ""}
      onChange={(e) => {
        if (regex.test(e.target.value)) {
          setValue(e.target.value);
          handleUpdate(e.target.value === "" ? null : e.target.value);
        }
      }}
    />
  );
}

function Category({
  info,
  depth,
  canDelete,
  cbDeleteSelf,
  cbAddAfterSelf,
  cbUpdateParent,
}) {
  const depthColors = ["#BBB", "#DDD", "#FFF"];
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
      handleFieldsChange(["children"], [deleteFromArray(children, idx)]);
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
              type="text"
              initValue={name}
              regex={/[0-9a-zA-z]*/}
              handleUpdate={(newVal) => handleFieldsChange(["name"], [newVal])}
            />
          </div>
          <div className="gradeWeight inline">
            Weight:{" "}
            <SmartInput
              className="weight"
              regex={/^([0-9]+(\.[0-9]{1,3})?)*$/}
              type="text"
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
                regex={/^([0-9]+(\.[0-9]{1,3})?)*$/}
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
              <input className="score" disabled type="text" value={scoreText} />
            </div>
          )}
          <div className="gradeRowButtons">
            <button onClick={cbAddAfterSelf}>Add</button>
            {!isLeaf && (
              <button onClick={() => setHidden((prev) => !prev)}>
                {hidden ? "Show" : "Hide"}
              </button>
            )}
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
            {(depth > 0 || canDelete) && (
              <button onClick={() => cbDeleteSelf()}>Delete</button>
            )}
          </div>
        </div>
      </div>
      {!isLeaf && !hidden && (
        <div className="gradeChildren">
          {info.children.map((c, idx) => (
            <Category
              key={c.name}
              showAdd={idx === info.children.length - 1}
              info={c}
              depth={depth + 1}
              cbDeleteSelf={() => deleteChild(idx)}
              cbAddAfterSelf={() =>
                handleFieldsChange(
                  ["children"],
                  [addToArray(children, idx, newCategory())]
                )
              }
              cbUpdateParent={(newData) =>
                handleFieldsChange(
                  ["children"],
                  [replaceInArray(children, idx, newData)]
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function deleteFromArray(array, idx) {
  const arrayCopy = [...array];
  arrayCopy.splice(idx, 1);
  return arrayCopy;
}

function addToArray(array, idx, item) {
  const arrayCopy = [...array];
  arrayCopy.splice(idx + 1, 0, item);
  return arrayCopy;
}

function replaceInArray(array, idx, item) {
  const arrayCopy = [...array];
  arrayCopy[idx] = item;
  return arrayCopy;
}

export default function Course({ user }) {
  const { title } = useParams();
  const courseInfo = user.courses.find((course) => course.title === title);

  const [gradeData, setGradeData] = useState(courseInfo.categories);
  const scoreText = calculateScore(gradeData);

  return (
    <>
      {JSON.stringify(gradeData)}
      <h1 className="courseTitle">{`${title} Score: ${scoreText}`}</h1>
      <h2>Score: {scoreText}</h2>
      <main className="courseContainer">
        {gradeData.map((c, idx) => (
          <Category
            key={c.name}
            info={c}
            depth={0}
            canDelete={gradeData.length > 1}
            cbDeleteSelf={() => setGradeData(deleteFromArray(gradeData, idx))}
            cbAddAfterSelf={() =>
              setGradeData(addToArray(gradeData, idx, newCategory()))
            }
            cbUpdateParent={(newData) =>
              setGradeData(replaceInArray(gradeData, idx, newData))
            }
          />
        ))}
        <button type="submit">Save Changes</button>
      </main>
    </>
  );
}
