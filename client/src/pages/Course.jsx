import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as ArrayUtil from "../lib/arrayUtil";
import StorageAPI from "../lib/storageAPI";
import AuthenticatedPage from "../components/AuthenticatedPage";
import { DeleteIcon, DownIcon, PlusIcon, SettingsIcon, UpIcon } from "../components/Icons";
import {
  extractUnknowns,
  calculateScore,
  newCategory,
  markChildrenToBeDropped,
  addIDs,
  cleanUpBeforeSaving,
  round,
} from "../lib/scoreUtil";

import styles from "../styles/Course.module.css";

export const numRegex = /^([0-9]+((\.)|(\.[0-9]{0,3}))?)?$/;
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
      className={`${styles.smartInput} ${className}`}
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

const minBottomLeftPos = Object.freeze({ x: -10, y: -10 });
const maxTopRightPos = Object.freeze({ x: 210, y: 210 });

function Canvas({ computeScore, desiredScore }) {
  const ref = useRef(null);
  const [bottomLeftPos, setBottomLeftPos] = useState({ x: -10, y: -10 });
  const [worldSize, setWorldSize] = useState({ width: 120, height: 120 });
  const [mousePos, setMousePos] = useState({ x: -2000, y: -2000 });
  const [mouseDragStart, setMouseDragStart] = useState(null);
  const [mouseDragging, setMouseDragging] = useState(false);

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function resizeCanvasToDisplaySize(canvas) {
    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== width || canvas.height !== height) {
      const { devicePixelRatio: ratio = 1 } = window;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
  }

  function getColor(r, g, b, a = 255) {
    return { r, g, b, a, toString: () => `rgba(${r}, ${g}, ${b}, ${a})` };
  }

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    resizeCanvasToDisplaySize(canvas);
    const { width, height } = canvas;
    const imgData = ctx.createImageData(width, height);

    let actualBottomLeftPos = bottomLeftPos;
    if (mouseDragging) {
      const mouseDiffX = (-(mousePos.x - mouseDragStart.x) * worldSize.width) / width;
      const mouseDiffY = ((mousePos.y - mouseDragStart.y) * worldSize.height) / height;
      actualBottomLeftPos = {
        x: clamp(bottomLeftPos.x + mouseDiffX, minBottomLeftPos.x, maxTopRightPos.x - worldSize.width),
        y: clamp(bottomLeftPos.y + mouseDiffY, minBottomLeftPos.y, maxTopRightPos.y - worldSize.height),
      };
    }

    function worldToPixel(x, y) {
      return {
        x: Math.floor(((x - actualBottomLeftPos.x) * width) / worldSize.width),
        y: height - Math.ceil(((y - actualBottomLeftPos.y) * height) / worldSize.height),
      };
    }

    function pixelToWorld(x, y) {
      return {
        x: actualBottomLeftPos.x + (x / width) * worldSize.width,
        y: actualBottomLeftPos.y + (1 - y / height) * worldSize.height,
      };
    }

    function mouseMoveHandler(e) {
      const rect = e.target.getBoundingClientRect();
      const { devicePixelRatio: ratio = 1 } = window;
      const newPos = { x: (e.clientX - rect.left) * ratio, y: (e.clientY - rect.top) * ratio };
      setMousePos(newPos);
    }

    function touchMoveHandler(e) {
      const rect = e.target.getBoundingClientRect();
      const { devicePixelRatio: ratio = 1 } = window;
      const newPos = { x: (e.touches[0].clientX - rect.left) * ratio, y: (e.touches[0].clientY - rect.top) * ratio };
      setMousePos(newPos);
      e.preventDefault();
    }

    function mouseDownHandler(e) {
      setMouseDragging(true);
      const rect = e.target.getBoundingClientRect();
      const { devicePixelRatio: ratio = 1 } = window;
      const newPos = { x: (e.clientX - rect.left) * ratio, y: (e.clientY - rect.top) * ratio };
      setMouseDragStart(newPos);
    }

    function touchDownHandler(e) {
      setMouseDragging(true);
      const rect = e.target.getBoundingClientRect();
      const { devicePixelRatio: ratio = 1 } = window;
      const newPos = { x: (e.touches[0].clientX - rect.left) * ratio, y: (e.touches[0].clientY - rect.top) * ratio };
      setMousePos(newPos);
      setMouseDragStart(newPos);
    }

    function mouseUpHandler(e) {
      if (mouseDragStart) {
        const mouseDiffX = (-(mousePos.x - mouseDragStart.x) * worldSize.width) / width;
        const mouseDiffY = ((mousePos.y - mouseDragStart.y) * worldSize.height) / height;

        setBottomLeftPos((prev) => ({
          x: clamp(prev.x + mouseDiffX, minBottomLeftPos.x, maxTopRightPos.x - worldSize.width),
          y: clamp(prev.y + mouseDiffY, minBottomLeftPos.y, maxTopRightPos.y - worldSize.height),
        }));
      }
      setMouseDragging(false);
      setMouseDragStart(null);
    }

    function mouseOutHandler(e) {
      mouseUpHandler(e);
    }

    function mouseWheelHandler(e) {
      e.preventDefault();

      // Scale world size
      const scale = e.deltaY >= 0 ? 1 + e.deltaY * 0.005 : 1 / (1 - e.deltaY * 0.005);
      const newWorldSize = {
        width: Math.min(Math.max(0.5, worldSize.width * scale), maxTopRightPos.x - minBottomLeftPos.x),
        height: Math.min(Math.max(0.5, worldSize.height * scale), maxTopRightPos.y - minBottomLeftPos.y),
      };

      const relativeMousePos = {
        x: mousePos.x / width,
        y: mousePos.y / height,
      };

      const mousePosInWorld = pixelToWorld(mousePos.x, mousePos.y);

      // Cap world's bottom left
      const newBottomLeftPos = {
        x: Math.max(mousePosInWorld.x - relativeMousePos.x * newWorldSize.width, minBottomLeftPos.x),
        y: Math.max(mousePosInWorld.y - (1 - relativeMousePos.y) * newWorldSize.height, minBottomLeftPos.y),
      };

      // Cap world's top right
      if (newBottomLeftPos.x + newWorldSize.width > maxTopRightPos.x) {
        newBottomLeftPos.x = maxTopRightPos.x - newWorldSize.width;
      }
      if (newBottomLeftPos.y + newWorldSize.height > maxTopRightPos.y) {
        newBottomLeftPos.y = maxTopRightPos.y - newWorldSize.height;
      }

      // Update world
      setWorldSize(newWorldSize);
      setBottomLeftPos(newBottomLeftPos);
    }

    const isMobile = window.matchMedia("only screen and (max-width: 480px)").matches;

    if (isMobile) {
      canvas.addEventListener("touchmove", touchMoveHandler);
      canvas.addEventListener("touchstart", touchDownHandler);
      canvas.addEventListener("touchend", mouseUpHandler);
    } else {
      canvas.addEventListener("mousemove", mouseMoveHandler);
      canvas.addEventListener("mousedown", mouseDownHandler);
      canvas.addEventListener("mouseup", mouseUpHandler);
      canvas.addEventListener("mouseout", mouseOutHandler);
      canvas.addEventListener("wheel", mouseWheelHandler);
    }

    function getCutoffBinarySearch(y, initLow = 0, initHigh = width - 1) {
      function binarySearch(low, high) {
        if (low >= high) return low;
        const mid = Math.floor((low + high) / 2);
        const coordinate = pixelToWorld(mid, y);
        const score = computeScore(coordinate.x, coordinate.y);
        if (score >= desiredScore) {
          return binarySearch(low, mid);
        }
        return binarySearch(mid + 1, high);
      }
      return binarySearch(initLow, initHigh);
    }

    function drawScore() {
      function drawPixel(x, y, color) {
        const i = (y * width + x) * 4;
        imgData.data[i] = color.r;
        imgData.data[i + 1] = color.g;
        imgData.data[i + 2] = color.b;
        imgData.data[i + 3] = color.a;
      }

      const goodColor = getColor(0, 255, 0);
      const badColor = getColor(255, 0, 0);

      for (let y = 0; y < height; y++) {
        const lastBadX = getCutoffBinarySearch(y);
        for (let x = 0; x <= lastBadX; x++) {
          drawPixel(x, y, badColor);
        }
        for (let x = lastBadX + 1; x < width; x++) {
          drawPixel(x, y, goodColor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    function drawGrid() {
      const axisColor = getColor(255, 255, 255).toString();
      const labelColor = getColor(0, 0, 0).toString();

      const gaps = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.1, 0.05, 0.01];
      const xGap = gaps.findLast((gap) => gap >= worldSize.width / 10);
      const yGap = gaps.findLast((gap) => gap >= worldSize.height / 10);

      const firstLeft = Math.round((actualBottomLeftPos.x + xGap / 2) / xGap) * xGap;
      const firstBottom = Math.round((actualBottomLeftPos.y + yGap / 2) / yGap) * yGap;

      ctx.fillStyle = labelColor;
      ctx.strokeStyle = axisColor;
      ctx.textAlign = "center";
      const fontSize = canvas.height / 30;
      ctx.font = `bold ${fontSize}px Arial`;

      // Draw vertical lines
      for (let x = firstLeft; x <= actualBottomLeftPos.x + worldSize.width; x += xGap) {
        ctx.lineWidth = Math.abs(x) === 0 || x === 100 ? 4 : 1;
        const { x: xPixel, y: yPixel } = worldToPixel(x, firstBottom);
        ctx.beginPath();
        ctx.moveTo(xPixel, 0);
        ctx.lineTo(xPixel, height);
        ctx.stroke();
        ctx.closePath();
        if (x !== firstLeft && Math.abs(x) !== 0 && x !== 100) ctx.fillText(`${round(x)}`, xPixel, yPixel - 10);
      }

      // Draw horizontal lines
      for (let y = firstBottom; y <= actualBottomLeftPos.y + worldSize.height; y += yGap) {
        ctx.lineWidth = Math.abs(y) === 0 || y === 100 ? 4 : 1;
        const { x: xPixel, y: yPixel } = worldToPixel(firstLeft, y);
        ctx.beginPath();
        ctx.moveTo(0, yPixel);
        ctx.lineTo(width, yPixel);
        ctx.stroke();
        ctx.closePath();
        if (y !== firstBottom && Math.abs(y) !== 0 && y !== 100) ctx.fillText(`${round(y)}`, xPixel + 25, yPixel - 5);
      }
    }

    function getTextDrawPosition(scoreBoxWidth, scoreBoxHeight) {
      const distFromEdge = 1;
      const distFromCursor = 20;

      let drawX, drawY;

      if (mousePos.x - scoreBoxWidth / 2 <= distFromEdge) {
        drawX = mousePos.x + distFromCursor + scoreBoxWidth / 2;
      } else if (mousePos.x + scoreBoxWidth / 2 >= width - distFromEdge) {
        drawX = mousePos.x - 2 * distFromCursor - scoreBoxWidth / 2;
      } else {
        drawX = mousePos.x;
      }

      if (
        drawX !== mousePos.x &&
        mousePos.y - scoreBoxHeight / 2 > distFromEdge &&
        mousePos.y + scoreBoxHeight / 2 < height - distFromEdge
      ) {
        drawY = mousePos.y;
      } else if (mousePos.y - distFromCursor - scoreBoxHeight <= distFromEdge) {
        drawY = mousePos.y + distFromCursor + scoreBoxHeight / 2;
      } else {
        drawY = mousePos.y - distFromCursor - scoreBoxHeight / 2;
      }

      return { drawX, drawY };
    }

    function drawMouseIndicator() {
      ctx.fillStyle = "black";
      ctx.moveTo(mousePos.x, mousePos.y);
      ctx.arc(mousePos.x, mousePos.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      const coordinate = pixelToWorld(mousePos.x, mousePos.y);
      const score = computeScore(coordinate.x, coordinate.y);
      ctx.textAlign = "center";

      const fontSize = Math.floor(height / 25);
      ctx.font = `bold ${fontSize}px Arial`;
      const scoreBoxWidth = 10 * fontSize;
      const scoreBoxHeight = 3 * fontSize;

      const { drawX, drawY } = getTextDrawPosition(scoreBoxWidth, scoreBoxHeight);

      ctx.fillStyle = getColor(255, 255, 255, 0.7).toString();
      ctx.fillRect(drawX - scoreBoxWidth / 2, drawY - scoreBoxHeight / 2, scoreBoxWidth, scoreBoxHeight);

      ctx.fillStyle = "black";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;

      ctx.strokeRect(drawX - scoreBoxWidth / 2, drawY - scoreBoxHeight / 2, scoreBoxWidth, scoreBoxHeight);

      ctx.fillText(`(${round(coordinate.x)}%, ${round(coordinate.y)}%)`, drawX, drawY - fontSize / 4);
      ctx.fillText(`Score: ${round(score)}%`, drawX, drawY + fontSize);
    }

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw stuff
    drawScore();
    drawGrid();
    drawMouseIndicator();

    return () => {
      if (isMobile) {
        canvas.removeEventListener("touchmove", touchMoveHandler);
        canvas.removeEventListener("touchstart", touchDownHandler);
        canvas.removeEventListener("touchend", mouseUpHandler);
      } else {
        canvas.removeEventListener("mousemove", mouseMoveHandler);
        canvas.removeEventListener("mousedown", mouseDownHandler);
        canvas.removeEventListener("mouseup", mouseUpHandler);
        canvas.removeEventListener("mouseout", mouseOutHandler);
        canvas.removeEventListener("wheel", mouseWheelHandler);
      }
    };
  }, [bottomLeftPos, worldSize, mousePos, mouseDragStart, mouseDragging, computeScore, desiredScore]);

  return (
    <div className={`${styles.canvasContainer}`}>
      <canvas ref={ref}>Canvas is not supported</canvas>
      <button
        onClick={() => {
          setBottomLeftPos({ x: -10, y: -10 });
          setWorldSize({ width: 120, height: 120 });
        }}
      >
        Reset
      </button>
    </div>
  );
}

function ScoreVisualization({ desiredScore, gradeData, whatIfData, setWhatIfData }) {
  const unknowns = useMemo(() => extractUnknowns(gradeData), [gradeData]);
  const [unknownX, setUnknownX] = useState(null);
  const [unknownY, setUnknownY] = useState(null);
  const [envSliderValues, setEnvSliderValues] = useState(
    unknowns.reduce((total, current) => ({ ...total, [current.name]: 80 }), {})
  );
  const [loaded, setLoaded] = useState(false);

  // If whatIfData is given, update unknowns and stuff on load
  useEffect(() => {
    if (!loaded) {
      if (whatIfData) {
        setUnknownX(whatIfData.unknownX);
        setUnknownY(whatIfData.unknownY);
        setEnvSliderValues(whatIfData.envSliderValues);
      } else {
        setUnknownX(unknowns[0] ?? null);
        setUnknownY(unknowns[1] ?? null);
      }
      setLoaded(true);
    }
  }, [whatIfData, loaded, unknowns]);

  // Update unknowns and axes when updated
  useEffect(() => {
    if (loaded) {
      if (unknowns.length === 1 && !unknownX && !unknownY) {
        setUnknownX(unknowns[0]);
        return;
      }
      setUnknownX((prevX) => {
        if (unknowns.map((u) => u.name).includes(prevX?.name)) return prevX;
        return unknowns.find((u) => u.name !== unknownY?.name) ?? null;
      });
      setUnknownY((prevY) => {
        if (unknowns.map((u) => u.name).includes(prevY?.name)) return prevY;
        return unknowns.find((u) => u.name !== unknownX?.name) ?? null;
      });

      setEnvSliderValues((prev) => {
        let sliderValues = unknowns.reduce((total, current) => ({ ...total, [current.name]: 80 }), {});
        for (const key of Object.keys(sliderValues)) {
          if (key in prev) {
            sliderValues[key] = prev[key];
          }
        }
        return sliderValues;
      });
    }
  }, [unknowns, unknownX, unknownY, loaded]);

  // Update parent whenever any what if data changes
  useEffect(() => {
    setWhatIfData({
      unknownX,
      unknownY,
      envSliderValues,
    });
  }, [unknownX, unknownY, envSliderValues, setWhatIfData]);

  function swapAxes() {
    // No need for temp here since changes don't occur until rerender
    setUnknownX(unknownY);
    setUnknownY(unknownX);
  }

  function computeScore(x, y) {
    const env = { ...envSliderValues };
    if (unknownX) env[unknownX.name] = x;
    if (unknownY) env[unknownY.name] = y;
    return calculateScore(gradeData, true, env);
  }

  return (
    <>
      <div className={`${styles.visualization}`}>
        <h2>What If?</h2>
        <Canvas computeScore={computeScore} desiredScore={desiredScore} />
        <div className={`${styles.axisVariables}`}>
          <p>
            X Axis:{" "}
            <select
              value={unknownX?.name ?? ""}
              onChange={(e) => setUnknownX(unknowns.find((u) => u.name === e.target.value))}
            >
              <option disabled value="">
                ----- None -----
              </option>
              {unknowns
                .filter((u) => u.name !== unknownY?.name)
                .map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name}
                  </option>
                ))}
            </select>
          </p>
          <p>
            <button onClick={swapAxes}>Swap</button>
          </p>
          <p>
            Y Axis:{" "}
            <select
              value={unknownY?.name ?? ""}
              onChange={(e) => setUnknownY(unknowns.find((u) => u.name === e.target.value))}
            >
              <option disabled value="">
                ----- None -----
              </option>
              {unknowns
                .filter((u) => u.name !== unknownX?.name)
                .map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name}
                  </option>
                ))}
            </select>
          </p>
        </div>
        <div className={`${styles.scoreSliders}`}>
          {unknowns
            .filter((v) => v.name !== unknownX?.name && v.name !== unknownY?.name)
            .map((u) => (
              <div className={`${styles.slider}`} key={u.name}>
                <p className={`${styles.name}`}>{u.name}: </p>
                <input
                  type="range"
                  min={0}
                  max={u.pointsDenom ?? 100}
                  step={1}
                  value={Math.min(
                    u.pointsDenom ?? 100,
                    envSliderValues[u.name] !== undefined
                      ? (envSliderValues[u.name] / 100) * (u.pointsDenom ?? 100)
                      : 0.8 * (u.pointsDenom ?? 100)
                  )}
                  onChange={(e) =>
                    setEnvSliderValues((prev) => ({
                      ...prev,
                      [u.name]: (parseFloat(e.target.value) / (u.pointsDenom ?? 100)) * 100,
                    }))
                  }
                />{" "}
                <p>
                  {round(
                    envSliderValues[u.name] !== undefined
                      ? (envSliderValues[u.name] / 100) * (u.pointsDenom ?? 100)
                      : 0.8 * (u.pointsDenom ?? 100)
                  )}
                </p>
              </div>
            ))}
        </div>
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
    scoreText = scoreIgnoreCap === null ? "N/A" : `${round(scoreIgnoreCap)}%`;
  } else if (scoreIgnoreCap === null) {
    scoreText = "N/A";
  } else if (scoreIgnoreCap > 100) {
    scoreText = capped ? "100%" : `${round(scoreIgnoreCap)}%`;
  } else {
    scoreText = `${round(scoreIgnoreCap)}%`;
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
        <div className={`${styles.settingsMenu}`} onClick={(e) => e.stopPropagation()}>
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
                <button
                  onClick={() => {
                    handleFieldsChange({ capped: !capped });
                    setSettingsNeedUpdated(true);
                  }}
                >
                  {capped ? "" : "Don't"} Cap at 100%
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
    capped,
  ]);

  const markedChildren = !isLeaf && dropCount > 0 ? markChildrenToBeDropped(children, dropCount) : children;

  return (
    <>
      {!isRoot && (
        <tr style={backColorStyle}>
          <td className={`${styles.gradeName}`}>
            <SmartInput
              initValue={name}
              regex={alphaNumRegex}
              handleUpdate={(newVal) => handleFieldsChange({ name: newVal })}
              style={{ textDecoration: isDropped ? "line-through" : "none" }}
            />
          </td>
          <td className={`${styles.gradeWeight}`}>
            <SmartInput
              className={`${styles.weight}`}
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
          <td className={`${styles.gradePoints}`}>
            {isLeaf ? (
              <>
                <SmartInput
                  className={`${styles.score}`}
                  regex={numRegex}
                  numeric
                  initValue={pointsNum}
                  handleUpdate={(newVal) => handleFieldsChange({ pointsNum: newVal })}
                />
                /
                <SmartInput
                  className={`${styles.score}`}
                  regex={numRegex}
                  numeric
                  initValue={pointsDenom}
                  placeholder={100}
                  handleUpdate={(newVal) => {
                    const newPointsDenom = newVal <= 0 && newVal !== null ? 100 : newVal;
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
          <td className={`${styles.gradeScore}`}>{scoreText}</td>
          <td>
            <div className={`${styles.gradeRowButtons}`}>
              <div className={`${styles.upDownButtons}`}>
                <button
                  className={`${styles.iconButton}`}
                  title="Move Up"
                  disabled={!canMoveUp}
                  onClick={() => cbMoveSelf(-1)}
                >
                  <UpIcon />
                </button>
                <button
                  className={`${styles.iconButton}`}
                  title="Move Down"
                  disabled={!canMoveDown}
                  onClick={() => cbMoveSelf(1)}
                >
                  <DownIcon />
                </button>
              </div>
              <button className={`${styles.iconButton}`} title="Add Category" onClick={cbAddAfterSelf}>
                <PlusIcon />
              </button>
              <button
                className={`${styles.iconButton}`}
                title="Delete"
                disabled={!canDeleteSelf}
                onClick={() => cbDeleteSelf()}
              >
                <DeleteIcon />
              </button>
              <button
                className={`${styles.iconButton}`}
                title="Open Settings"
                onClick={() => setSettingsNeedUpdated(true)}
              >
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
  const [whatIfData, setWhatIfData] = useState(null);
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
        setWhatIfData(course.whatIfData);
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

  function exportCourse(data) {
    // Recursive function to erase scores from existing obj (done in-place)
    function clearScores(dataObj) {
      if (dataObj.children === undefined) {
        dataObj.pointsNum = null;
      } else {
        dataObj.children.forEach((child) => clearScores(child));
      }
      return dataObj;
    }

    const keepScores = window.confirm(
      "Would you like to export your scores as well? If yes, click 'OK'. If you only want a template, click 'Cancel'."
    );

    // Get JSON
    let jsonToWrite = "";
    if (keepScores) {
      jsonToWrite = JSON.stringify(data, undefined, 4);
    } else {
      const dataCopy = JSON.parse(JSON.stringify(data));
      clearScores(dataCopy.root);
      jsonToWrite = JSON.stringify({ ...dataCopy, whatIfData: undefined, desiredScore: undefined }, undefined, 4);
    }

    // Write to file (taken from StackOverflow)
    const a = document.createElement("a");
    a.href = "data:application/octet-stream," + encodeURIComponent(jsonToWrite);
    a.download = keepScores ? `${data.title}.txt` : `${data.title}.template.txt`;
    a.click();
  }

  useEffect(getCourse, [loggedIn, navigate, title]);

  if (!loaded) return "";

  const scoreTextIgnoreCap = calculateScore(gradeData, false);
  const scoreText =
    scoreTextIgnoreCap === null
      ? "N/A"
      : scoreTextIgnoreCap > 100 && gradeData.capped
      ? 100
      : round(scoreTextIgnoreCap);

  return (
    <AuthenticatedPage initiallyLoggedIn={loggedIn}>
      <div className={`${styles.courseContainer}`}>
        <h1>
          Course Title:{" "}
          <input
            className={`${styles.courseTitle}`}
            type="text"
            value={currTitle}
            onChange={(e) => setCurrTitle(e.target.value)}
            onBlur={(e) => setCurrTitle(e.target.value.trim())}
          />
        </h1>
        <h2
          className={`${styles.courseScore}`}
          onClick={() => setGradeData((data) => ({ ...data, capped: !data.capped }))}
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          {`Score: ${scoreText}`}{" "}
          <span>{scoreTextIgnoreCap !== null && scoreTextIgnoreCap > 100 && gradeData.capped ? "(Capped)" : ""}</span>
        </h2>

        <table className={`${styles.courseTable}`}>
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
      <div className={`${styles.scoreButtonContainer}`}>
        <div className={`${styles.desiredScore}`}>
          Desired Score:{" "}
          <input
            type="number"
            value={desiredScore ?? ""}
            onChange={(e) => {
              setDesiredScore(e.target.value === "" ? null : parseFloat(e.target.value));
            }}
          />
        </div>
        <div className={`${styles.manageButtons}`}>
          <button
            onClick={() => {
              exportCourse({
                title: currTitle,
                root: cleanUpBeforeSaving(gradeData),
                whatIfData,
                desiredScore,
              });
            }}
          >
            Export Course
          </button>
          <button
            onClick={() => {
              saveCourse(title, {
                title: currTitle,
                root: cleanUpBeforeSaving(gradeData),
                whatIfData,
                desiredScore,
              });
            }}
          >
            Save Changes
          </button>
          <button onClick={() => deleteCourse(title)}>Delete Course</button>
        </div>
      </div>
      <ScoreVisualization
        desiredScore={desiredScore}
        gradeData={gradeData}
        whatIfData={whatIfData}
        setWhatIfData={setWhatIfData}
      />
      {!!settingsMenu && (
        <div className="darkOverlay" onClick={() => setSettingsMenu(null)}>
          {settingsMenu}
        </div>
      )}
    </AuthenticatedPage>
  );
}
