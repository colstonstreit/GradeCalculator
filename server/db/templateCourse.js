/*
 * If score is null, then it simply is empty.
 * Else if score is of type number, that score is a leaf node.
 * Else, score will be of type array, where entries are subcategories.
 */
const templateCourse = {
  title: "Template",
  categories: [
    { name: "Homework", weight: 50, score: 100 },
    {
      name: "Midterm",
      weight: 25,
      score: 100,
    },
    { name: "Final", weight: 25, score: null },
  ],
};

module.exports = templateCourse;
