import React, { useState, useEffect } from "react";
import { json, Link, useParams } from "react-router-dom";

function Category({ info, depth, showAdd, canDelete }) {

  const depthColors = [
    "#BBB",
    "#DDD",
    "#FFF"
  ];
  const backColor = depth < depthColors.length ? depthColors[depth] : "#00FF00";
  const backColorStyle = { backgroundColor: backColor };

  const [name, setName] = useState(info.name);
  const [weight, setWeight] = useState(info.weight);
  const [score, setScore] = useState(info.score);
  const [hidden, setHidden] = useState(false);

  const isLeaf = (score === null || typeof score === "number");

  return <>
    <div className="gradeRow" style={backColorStyle}>
      <div className="gradeRowContentWrapper inline">
        <div className="gradeName inline">Name: <input style={backColorStyle} type="text" value={name} onChange={e => setName(e.target.value)}/></div>
        <div className="gradeWeight inline">Weight: <input className="weight" style={backColorStyle} type="text" value={weight} onChange={e => setWeight(e.target.value)}/></div>
        {
          isLeaf
          && <div className="gradeScore inline">Score: <input className="score" style={backColorStyle} type="text" value={score} onChange={e => setScore(e.target.value.length >= 1 ? parseFloat(e.target.value) : null)}/></div>
        }
        {
          !isLeaf
          && <div className="gradeScoreAuto">Score: <input className="score" style={backColorStyle} disabled type="text" value={100}/></div>
        }
        <div className="gradeRowButtons">
          {showAdd && <button>Add</button>}
          {(!isLeaf) && <button>{hidden ? "Show" : "Hide"}</button>}
          <button>Add Sub</button>
          {(depth > 0 || canDelete)  && <button>Delete</button>}
        </div>
      </div>
    </div>
    {!isLeaf
      && <div className="gradeChildren">{ score.map((subcategory, idx) => <Category key={idx} info={subcategory} depth={depth + 1}/>)}</div>}
  </>
}

function RootCategory({ subcategories }) {

  return <>
    { subcategories.map((c, idx) =>
      <Category key={idx} info={c} depth={0}
                showAdd={idx == subcategories.length - 1}
                canDelete={subcategories.length > 1} />) }
  </>
}

export default function Course({ user }) {

  const {title} = useParams();
  const courseInfo = user.courses.find(course => course.title === title);

  return <>
    {JSON.stringify(courseInfo)}
    <h1 className="courseTitle">{title}</h1>
    <main className="courseContainer">
      <RootCategory subcategories={courseInfo.score}/>
      <button type="submit">Save Changes</button>
    </main>
  </>
}