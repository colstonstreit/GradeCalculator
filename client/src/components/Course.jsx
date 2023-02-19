import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as Util from "../lib/util";
import NetworkAPI from "../lib/networkAPI";
import AuthenticatedPage from "./AuthenticatedPage";

const numRegex = /^([0-9]+((\.)|(\.[0-9]{0,3}))?)?$/;
const alphaNumRegex = /^([0-9a-zA-z ]){0,20}$/;
const depthColors = ["#777", "#AAA", "#DDD", "#FFF"];

function SmartInput({ regex, numeric, initValue = "", handleUpdate, className = "" }) {
  const [value, setValue] = useState(initValue);

  function onUpdate(e) {
    if (regex.test(e.target.value)) {
      setValue(e.target.value);
      if (numeric) {
        handleUpdate(!isNaN(e.target.value) && e.target.value !== "" ? parseFloat(e.target.value) : null);
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
              handleUpdate={(newVal) => handleFieldsChange(["weight"], [newVal])}
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
              Score: <input className="score transparent" disabled type="text" value={scoreText} />
            </div>
          )}
          <div className="gradeRowButtons">
            {!isLeaf && <button onClick={() => setHidden((prev) => !prev)}>{hidden ? "Show" : "Hide"}</button>}
            {depth < depthColors.length - 1 && (
              <button
                onClick={() => {
                  const newChildren = children === undefined ? [newCategory()] : [...children, newCategory()];
                  handleFieldsChange(["score", "children"], [undefined, newChildren]);
                }}
              >
                Add Sub
              </button>
            )}
            {canMoveUp && <button onClick={() => cbMoveSelf(-1)}>Up</button>}
            {canMoveDown && <button onClick={() => cbMoveSelf(1)}>Down</button>}
            {(depth > 0 || canDelete) && <button onClick={() => cbDeleteSelf()}>X</button>}
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
                handleFieldsChange(["children"], [Util.swapInArray(children, idx, idx + dir)]);
              }}
              cbDeleteSelf={() => deleteChild(idx)}
              cbAddAfterSelf={() => handleFieldsChange(["children"], [Util.addToArray(children, idx, newCategory())])}
              cbUpdateParent={(newData) =>
                handleFieldsChange(["children"], [Util.replaceInArray(children, idx, newData)])
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
    name: "",
    weight: null,
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
  return round(totalSum / totalWeight);
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

function round(number, decimals = 2) {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
}

function saveDataToDatabase(originalTitle, data) {
  NetworkAPI.put(`/api/courses/${originalTitle}`, data)
    .then((_) => {
      window.location.href = `/courses/${data.title}`;
    })
    .catch(({ status, error }) => {
      alert("Error Occurred: " + status + " " + error);
    });
}

function deleteCourse(originalTitle) {
  NetworkAPI.delete(`/api/courses/${originalTitle}`)
    .then((_) => {
      window.location.replace(`/courses`);
    })
    .catch(({ status, error }) => {
      alert("Error Occurred: " + status + " " + error);
    });
}

function flatten(data) {
  function flattenHelper(data) {
    const res = [];
    for (const item of data) {
      if (item.weight === null || item.weight === 0) continue;
      if (item.children === undefined) {
        // Leaf Node
        res.push({ ...item });
      } else {
        // Internal, must get all children
        const newChildren = flattenHelper(item.children);
        const totalWeight = newChildren.reduce((total, current) => total + current.weight, 0);
        newChildren.forEach((child) => {
          child.weight *= item.weight / totalWeight;
          child.name = `${item.name}.${child.name}`;
        });
        res.push(...newChildren);
      }
    }
    return res;
  }

  // First flatten
  const flattened = flattenHelper(data);
  if (flattened.length === 0) return flattened;

  // Then normalize weights to have sum of 100
  const totalWeight = flattened.reduce((total, current) => total + current.weight, 0);
  flattened.forEach((item) => (item.weight *= 100 / totalWeight));
  return flattened;
}

export function GradeRequirement({ desiredScore, gradeData }) {
  const knowns = gradeData.filter((item) => item.score !== null);
  const unknowns = gradeData.filter((item) => item.score === null);

  const [totalSoFar, totalKnownWeight] = knowns.reduce(
    ([total, totalWeight], item) => [total + (item.score * item.weight) / 100, totalWeight + item.weight],
    [0, 0]
  );

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
                {round((known.score * known.weight) / 100)} / {round(known.weight)} points from {known.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="requiredGrade">
        {unknowns.length === 1 ? (
          <p>
            To get a {desiredScore}% in this course, you will need to get at least a{" "}
            {round(((desiredScore - totalSoFar) / (100 - totalKnownWeight)) * 100)}% on "{unknowns[0].name}".
          </p>
        ) : unknowns.length > 1 ? (
          <p>
            Hence, to get a {desiredScore}% in this course, you will need to get at least{" "}
            {round(desiredScore - round(totalSoFar), 2)} of the remaining {100 - round(totalKnownWeight)} points, which
            is an average score of {round(((desiredScore - totalSoFar) / (100 - totalKnownWeight)) * 100)}%.
          </p>
        ) : (
          ""
        )}
      </div>
    </>
  );
}

export default function Course() {
  const { title } = useParams();

  const [gradeData, setGradeData] = useState([]);
  const [currTitle, setCurrTitle] = useState(title);
  const [desiredScore, setDesiredScore] = useState(null);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function getCourse() {
      NetworkAPI.get(`/api/courses/${title}`)
        .then(({ data: course }) => {
          setCurrTitle(course.title);
          setGradeData(addIDs(course.categories));
          setDesiredScore(course.desiredScore);
          setLoaded(true);
        })
        .catch(({ error }) => {
          // Invalid course name, go back to list
          alert("Course does not exist!");
          window.location.replace("/courses");
        });
    }
    getCourse();
  }, [title]);

  const flattenedData = flatten(gradeData);
  const scoreText = calculateScore(flattenedData);

  if (!loaded) return "";

  return (
    <AuthenticatedPage>
      <main className="courseContainer">
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
        <h2 className="courseScore">{`Score: ${scoreText}`}</h2>
        {gradeData.map((c, idx) => (
          <Category
            key={c.id}
            info={c}
            depth={0}
            canDelete={gradeData.length > 1}
            canMoveUp={idx > 0}
            canMoveDown={idx < gradeData.length - 1}
            cbMoveSelf={(dir) => setGradeData(Util.swapInArray(gradeData, idx, idx + dir))}
            cbDeleteSelf={() => setGradeData(Util.deleteFromArray(gradeData, idx))}
            cbAddAfterSelf={() => setGradeData(Util.addToArray(gradeData, idx, newCategory()))}
            cbUpdateParent={(newData) => setGradeData(Util.replaceInArray(gradeData, idx, newData))}
          />
        ))}
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
                saveDataToDatabase(title, {
                  title: currTitle,
                  categories: getChildrenWithoutIDs(gradeData),
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
      </main>
    </AuthenticatedPage>
  );
}
