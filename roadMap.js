const RESOURCE_MAP = {
  SQL: { task: "Learn SELECT, filtering, JOIN, GROUP BY and aggregate functions.", resource: "https://sqlbolt.com/", project: "Analyze a small sales or student database.", estimatedHours: 4 },
  Excel: { task: "Practice formulas, sorting, filtering, charts and pivot tables.", resource: "https://support.microsoft.com/excel", project: "Create a spreadsheet dashboard.", estimatedHours: 4 },
  Python: { task: "Practice variables, conditions, loops, functions and data structures.", resource: "https://docs.python.org/3/tutorial/", project: "Write a script that cleans a CSV dataset.", estimatedHours: 6 },
  "Power BI": { task: "Learn importing data, basic transformations and report visuals.", resource: "https://learn.microsoft.com/training/powerplatform/power-bi/", project: "Build an interactive analytics report.", estimatedHours: 5 },
  Tableau: { task: "Practice chart types, filters and dashboard composition.", resource: "https://www.tableau.com/learn/training", project: "Create a visual analytics dashboard.", estimatedHours: 5 },
  Statistics: { task: "Learn mean, median, distributions, correlation and probability.", resource: "https://www.khanacademy.org/math/statistics-probability", project: "Summarize and explain a small dataset.", estimatedHours: 5 },
  JavaScript: { task: "Learn functions, arrays, objects, modules and async basics.", resource: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", project: "Build an interactive web page.", estimatedHours: 6 },
  React: { task: "Practice components, props, state, events and effects.", resource: "https://react.dev/learn", project: "Build a job-search interface.", estimatedHours: 6 },
  HTML: { task: "Practice semantic elements, forms and accessible structure.", resource: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content", project: "Create a portfolio page.", estimatedHours: 3 },
  CSS: { task: "Practice responsive layouts, Flexbox, Grid and spacing.", resource: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics", project: "Style a responsive dashboard.", estimatedHours: 5 },
  Java: { task: "Practice syntax, classes, collections and exceptions.", resource: "https://dev.java/learn/", project: "Build a student-record application.", estimatedHours: 6 },
  "C++": { task: "Practice functions, classes, vectors and basic memory concepts.", resource: "https://www.learncpp.com/", project: "Build a console-based record manager.", estimatedHours: 6 },
  Git: { task: "Practice commits, branches, pull requests and merge conflicts.", resource: "https://skills.github.com/", project: "Contribute a feature on a separate branch.", estimatedHours: 3 },
  MongoDB: { task: "Learn documents, queries and CRUD operations.", resource: "https://learn.mongodb.com/", project: "Store and query job listings.", estimatedHours: 4 },
  "Node.js": { task: "Learn modules, async code and simple APIs.", resource: "https://nodejs.org/en/learn", project: "Create a REST API.", estimatedHours: 5 },
  Communication: { task: "Practice explaining a technical concept clearly.", resource: "https://www.toastmasters.org/resources", project: "Give a three-minute project presentation.", estimatedHours: 2 },
};

export function generateRoadmap(missingSkills = []) {
  return [...new Set(missingSkills)].map((skill, index) => ({
    id: `${index + 1}-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    skill,
    priority: index < 2 ? "High" : "Medium",
    ...(RESOURCE_MAP[skill] ?? {
      task: `Learn the fundamentals of ${skill} and practise with guided exercises.`,
      resource: "https://developer.mozilla.org/",
      project: `Build a small project demonstrating ${skill}.`,
      estimatedHours: 3,
    }),
    completed: false,
  }));
}
