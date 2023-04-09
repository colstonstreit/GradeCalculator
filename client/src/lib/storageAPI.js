import templateCourse from "./templateCourse";
import NetworkAPI from "./networkAPI";

function createCourse(title, loggedIn) {
  return new Promise((resolve, reject) => {
    if (!loggedIn) {
      const courses = JSON.parse(localStorage.getItem("courses") ?? "[]");
      const existingCourse = courses.find((course) => course.title === title);
      if (existingCourse) {
        reject(new Error("A course by this name already exists!"));
        return;
      }

      courses.push({
        title: title,
        root: templateCourse.root,
        desiredScore: 90,
      });

      localStorage.setItem("courses", JSON.stringify(courses));
      resolve("Course created successfully.");
    } else {
      NetworkAPI.post(`/api/courses`, { title })
        .then(({ data: msg }) => resolve(msg))
        .catch(({ status, error }) => reject(new Error(`${status} error: ${error.message}`)));
    }
  });
}

// Get entire course object
function getCourse(title, loggedIn) {
  return new Promise((resolve, reject) => {
    if (!loggedIn) {
      const courses = JSON.parse(localStorage.getItem("courses") ?? "[]");
      const course = courses.find((course) => course.title === title);
      if (!course) {
        reject(new Error("Course does not exist!"));
        return;
      }
      resolve(course);
    } else {
      NetworkAPI.get(`/api/courses/${title}`)
        .then(({ data: course }) => resolve(course))
        .catch(({ status, error }) => reject(new Error(`${status} error: ${error.message}`)));
    }
  });
}

function getCourses(loggedIn) {
  return new Promise((resolve, reject) => {
    if (!loggedIn) {
      const courses = JSON.parse(localStorage.getItem("courses") ?? "[]");
      resolve(courses);
    } else {
      NetworkAPI.get(`/api/courses`)
        .then(({ data: courses }) => resolve(courses))
        .catch(({ status, error }) => reject(new Error(`${status} error: ${error.message}`)));
    }
  });
}

function updateCourse(originalTitle, newCourse, loggedIn) {
  return new Promise((resolve, reject) => {
    if (!loggedIn) {
      const courses = JSON.parse(localStorage.getItem("courses") ?? "[]");
      const idx = courses.findIndex((course) => course.title === originalTitle);
      if (idx < 0) {
        reject(new Error("Course does not exist!"));
        return;
      }

      const existingIdx = courses.findIndex((course) => course.title === newCourse.title);
      if (existingIdx >= 0 && idx !== existingIdx) {
        reject(new Error("You already have a course with this name."));
        return;
      }

      courses[idx] = newCourse;
      localStorage.setItem("courses", JSON.stringify(courses));
      resolve("Course updated successfully.");
    } else {
      NetworkAPI.put(`/api/courses/${originalTitle}`, newCourse)
        .then(() => resolve("Course updated successfully."))
        .catch(({ status, error }) => reject(new Error(`${status} error: ${error.message}`)));
    }
  });
}

function deleteCourse(title, loggedIn) {
  return new Promise((resolve, reject) => {
    if (!loggedIn) {
      const courses = JSON.parse(localStorage.getItem("courses") ?? "[]");
      const idx = courses.findIndex((course) => course.title === title);
      if (idx < 0) {
        reject(new Error("Course does not exist!"));
        return;
      }

      courses.splice(idx, 1);
      localStorage.setItem("courses", JSON.stringify(courses));
      resolve("Course deleted successfully.");
    } else {
      NetworkAPI.delete(`/api/courses/${title}`)
        .then(() => resolve("Course deleted successfully."))
        .catch(({ status, error }) => reject(new Error(`${status} error: ${error.message}`)));
    }
  });
}

const StorageAPI = {
  createCourse,
  getCourse,
  getCourses,
  updateCourse,
  deleteCourse,
};

export default StorageAPI;
