
/*
 * If score is null, then it simply is empty.
 * Else if score is of type number, that score is a leaf node.
 * Else, score will be of type array, where entries are subcategories.
 */
const templateCourse = {
  title: "Template",
    score: [
      { name: "Homework", weight: 30, score: 95 },
      {
        name: "Project", weight: 20, score: [
          { name: "Stage 1", weight: 25, score: 100 },
          { name: "Stage 2", weight: 25, score: 100 },
          { name: "Final Presentation", weight: 50, score: 85 }
        ]
      },
      { name: "Midterm", weight: 25, score: 90 },
      { name: "Final", weight: 25, score: null },
    ]
}

module.exports = templateCourse;