/*
 * If score is null, then it simply is empty.
 * Else if score is of type number, that score is a leaf node.
 * Else, score will be of type array, where entries are subcategories.
 */
const templateCourse = {
  title: "Template",
  root: {
    name: "Root",
    weight: 100,
    children: [
      { name: "Homework", weight: 50, pointsNum: null },
      {
        name: "Midterm",
        weight: 25,
        pointsNum: null,
      },
      { name: "Final", weight: 25, pointsNum: null },
    ],
  },
};

module.exports = templateCourse;
