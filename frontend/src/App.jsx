
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./services/api";
import "./App.css";

const emptyStudent = {
  name: "",
  email: "",
  phone: "",
  department: "",
  course: "",
};

const emptyCourse = {
  name: "",
  description: "",
  duration: "",
  department: "",
};

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token") || ""
  );
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [enrollmentStudent, setEnrollmentStudent] = useState({});
  const [enrolledByCourse, setEnrolledByCourse] = useState({});

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const loadData = useCallback(async () => {
    const [studentData, courseData] = await Promise.all([
      apiRequest("/students"),
      apiRequest("/courses"),
    ]);

    // API responses may be arrays directly or objects containing the arrays.
    // Normalize both formats so the UI always receives arrays.
    const normalizedStudents = Array.isArray(studentData)
      ? studentData
      : Array.isArray(studentData?.students)
        ? studentData.students
        : Array.isArray(studentData?.data)
          ? studentData.data
          : [];

    const normalizedCourses = Array.isArray(courseData)
      ? courseData
      : Array.isArray(courseData?.courses)
        ? courseData.courses
        : Array.isArray(courseData?.data)
          ? courseData.data
          : [];

    setStudents(normalizedStudents);
    setCourses(normalizedCourses);
  }, []);

  const loadUser = useCallback(async () => {
    const currentUser = await apiRequest("/auth/me");
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (!token) return;

    Promise.all([loadUser(), loadData()]).catch((err) => {
      setError(err.message);
      if (
        err.message.toLowerCase().includes("token") ||
        err.message.toLowerCase().includes("authenticat")
      ) {
        logout();
      }
    });
  }, [token, loadData, loadUser]);

  function logout() {
    localStorage.removeItem("access_token");
    setToken("");
    setUser(null);
    setStudents([]);
    setCourses([]);
    setPage("dashboard");
    setMessage("You have been logged out.");
    setError("");
  }

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (authMode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify(authForm),
        });
        setMessage("Registration successful! Please log in.");
        setAuthMode("login");
        setAuthForm((old) => ({ ...old, name: "" }));
      } else {
        const result = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
          }),
        });

        localStorage.setItem("access_token", result.access_token);
        setToken(result.access_token);
        setPage("dashboard");
        setMessage("Login successful!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveStudent(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const path = editingStudent
        ? `/students/${editingStudent}`
        : "/students";

      await apiRequest(path, {
        method: editingStudent ? "PUT" : "POST",
        body: JSON.stringify(studentForm),
      });

      setStudentForm(emptyStudent);
      setEditingStudent(null);
      await loadData();
      setMessage(editingStudent ? "Student updated." : "Student added.");
    } catch (err) {
      setError(err.message);
    }
  }

  function editStudent(student) {
    setStudentForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      department: student.department,
      course: student.course,
    });
    setEditingStudent(student.id);
    setPage("students");
    setError("");
    setMessage("");
  }

  async function deleteStudent(id) {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      await apiRequest(`/students/${id}`, { method: "DELETE" });
      await loadData();
      setMessage("Student deleted.");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveCourse(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const path = editingCourse
        ? `/courses/${editingCourse}`
        : "/courses";

      await apiRequest(path, {
        method: editingCourse ? "PUT" : "POST",
        body: JSON.stringify(courseForm),
      });

      setCourseForm(emptyCourse);
      setEditingCourse(null);
      await loadData();
      setMessage(editingCourse ? "Course updated." : "Course added.");
    } catch (err) {
      setError(err.message);
    }
  }

  function editCourse(course) {
    setCourseForm({
      name: course.name,
      description: course.description,
      duration: course.duration,
      department: course.department,
    });
    setEditingCourse(course.id);
    setPage("courses");
    setError("");
    setMessage("");
  }

  async function deleteCourse(id) {
    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    try {
      await apiRequest(`/courses/${id}`, { method: "DELETE" });
      await loadData();
      setMessage("Course deleted.");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function enrollStudent(courseId) {
    const studentId = Number(enrollmentStudent[courseId]);

    if (!studentId) {
      setError("Please select a student first.");
      setMessage("");
      return;
    }

    try {
      await apiRequest(`/courses/${courseId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
      });
      setMessage("Student enrolled successfully.");
      setError("");
      await showEnrolledStudents(courseId, false);
    } catch (err) {
      setMessage("");
      if (String(err.message).includes("409") || String(err.message).toLowerCase().includes("already enrolled")) {
        setError("This student is already enrolled in this course. Click View enrolled to see the list.");
      } else {
        setError(err.message || "Unable to enroll the student. Please try again.");
      }
    }
  }

  async function showEnrolledStudents(courseId, showNotice = true) {
    try {
      const result = await apiRequest(`/courses/${courseId}/students`);
      if (!Array.isArray(result)) {
        throw new Error("The server returned an unexpected enrollment response.");
      }
      setEnrolledByCourse((previous) => ({ ...previous, [courseId]: result }));
      const names = result.map((item) => {
        const student = students.find((entry) => Number(entry.id) === Number(item.student_id));
        return student ? `${student.name} (ID: ${student.id})` : `Student ID: ${item.student_id}`;
      });
      if (showNotice) {
        setMessage(names.length ? `Enrolled students: ${names.join(", ")}` : "No students enrolled in this course yet.");
      }
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load enrolled students.");
      setMessage("");
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">SM</div>
          <p className="eyebrow">STUDENT MANAGEMENT SYSTEM</p>
          <h1>{authMode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="muted">
            {authMode === "login"
              ? "Log in to manage students and courses."
              : "Register to get started."}
          </p>

          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          <form onSubmit={handleAuth} className="form-stack">
            {authMode === "register" && (
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  placeholder="Enter your name"
                />
              </label>
            )}

            <label>
              Email address
              <input
                required
                type="email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                required
                minLength={8}
                type="password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                placeholder="At least 8 characters"
              />
            </label>

            <button className="primary-button" disabled={loading}>
              {loading
                ? "Please wait..."
                : authMode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          <p className="switch-auth">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              className="text-button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setError("");
                setMessage("");
              }}
            >
              {authMode === "login" ? "Register" : "Log in"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">SM</div>
          <div>
            <strong>CampusDesk</strong>
            <small>Student portal</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        {[
          ["dashboard", "Dashboard", "▦"],
          ["students", "Students", "♙"],
          ["courses", "Courses", "▤"],
        ].map(([key, label, symbol]) => (
          <button
            key={key}
            className={`nav-item ${page === key ? "active" : ""}`}
            onClick={() => {
              setPage(key);
              setError("");
              setMessage("");
            }}
          >
            <span>{symbol}</span> {label}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="profile-text">
              <strong>{user?.name || "User"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>
              {page === "dashboard"
                ? "Dashboard"
                : page === "students"
                  ? "Student Management"
                  : "Course Management"}
            </h1>
          </div>
          <button
            className="secondary-button"
            onClick={() =>
              loadData()
                .then(() => setMessage("Data refreshed."))
                .catch((err) => setError(err.message))
            }
          >
            ↻ Refresh
          </button>
        </header>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        {page === "dashboard" && (
          <>
            <section className="welcome-panel">
              <div>
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h2>Hello, {user?.name || "there"}!</h2>
                <p>Manage your student records and courses in one place.</p>
              </div>
              <div className="welcome-symbol">✦</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">♙</div>
                <p>Total students</p>
                <strong>{students.length}</strong>
                <small>Registered student records</small>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">▤</div>
                <p>Available courses</p>
                <strong>{courses.length}</strong>
                <small>Courses in the system</small>
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Quick actions</h2>
                  <p>Choose what you want to manage.</p>
                </div>
              </div>
              <div className="quick-actions">
                <button
                  className="action-card"
                  onClick={() => {
                    setStudentForm(emptyStudent);
                    setEditingStudent(null);
                    setPage("students");
                  }}
                >
                  <span className="action-icon blue">＋</span>
                  <strong>Add a student</strong>
                  <small>Create a student record</small>
                </button>
                <button
                  className="action-card"
                  onClick={() => {
                    setCourseForm(emptyCourse);
                    setEditingCourse(null);
                    setPage("courses");
                  }}
                >
                  <span className="action-icon purple">＋</span>
                  <strong>Add a course</strong>
                  <small>Create a new course</small>
                </button>
              </div>
            </section>
          </>
        )}

        {page === "students" && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{editingStudent ? "Edit student" : "Add a student"}</h2>
                <p>Enter the student's information below.</p>
              </div>
            </div>

            <form onSubmit={saveStudent} className="data-form">
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  value={studentForm.phone}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Department
                <input
                  required
                  value={studentForm.department}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      department: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Course name
                <input
                  required
                  value={studentForm.course}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, course: e.target.value })
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button">
                  {editingStudent ? "Save changes" : "Add student"}
                </button>
                {editingStudent && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditingStudent(null);
                      setStudentForm(emptyStudent);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="section-heading list-heading">
              <div>
                <h2>Student records</h2>
                <p>{students.length} student(s) found</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Course</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.department}</td>
                      <td>{student.course}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="small-button"
                            onClick={() => editStudent(student)}
                          >
                            Edit
                          </button>
                          <button
                            className="small-button danger-button"
                            onClick={() => deleteStudent(student.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!students.length && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No students found. Add your first student above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page === "courses" && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{editingCourse ? "Edit course" : "Add a course"}</h2>
                <p>Create and manage available courses.</p>
              </div>
            </div>

            <form onSubmit={saveCourse} className="data-form">
              <label>
                Course name
                <input
                  required
                  minLength={2}
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Duration
                <input
                  required
                  value={courseForm.duration}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, duration: e.target.value })
                  }
                  placeholder="e.g. 3 months"
                />
              </label>
              <label>
                Department
                <input
                  required
                  value={courseForm.department}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      department: e.target.value,
                    })
                  }
                />
              </label>
              <label className="full-width">
                Description
                <textarea
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                />
              </label>
              <div className="form-actions">
                <button className="primary-button">
                  {editingCourse ? "Save changes" : "Add course"}
                </button>
                {editingCourse && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseForm(emptyCourse);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="section-heading list-heading">
              <div>
                <h2>Available courses</h2>
                <p>{courses.length} course(s) found</p>
              </div>
            </div>

            <div className="course-grid">
              {courses.map((course) => (
                <article className="course-card" key={course.id}>
                  <div className="course-card-top">
                    <span className="course-symbol">▤</span>
                    <span className="course-id">COURSE #{course.id}</span>
                  </div>
                  <h3>{course.name}</h3>
                  <p>{course.description || "No description provided."}</p>
                  <div className="course-meta">
                    <span>Duration</span>
                    <strong>{course.duration}</strong>
                  </div>
                  <div className="course-meta">
                    <span>Department</span>
                    <strong>{course.department}</strong>
                  </div>

                  <label className="enrollment-select">
                    Enroll student
                    <select
                      value={enrollmentStudent[course.id] || ""}
                      onChange={(e) =>
                        setEnrollmentStudent({
                          ...enrollmentStudent,
                          [course.id]: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose a student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} (ID: {student.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="course-actions">
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => enrollStudent(course.id)}
                    >
                      Enroll
                    </button>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => showEnrolledStudents(course.id)}
                    >
                      View enrolled
                    </button>
                  </div>
                  {Object.prototype.hasOwnProperty.call(enrolledByCourse, course.id) && (
                    <div className="enrolled-students" role="status">
                      <strong>Enrolled students</strong>
                      {enrolledByCourse[course.id].length ? (
                        <ul>
                          {enrolledByCourse[course.id].map((enrollment) => {
                            const student = students.find(
                              (entry) => Number(entry.id) === Number(enrollment.student_id)
                            );
                            return (
                              <li key={enrollment.id}>
                                {student ? student.name : `Student ID: ${enrollment.student_id}`}
                                {` (ID: ${enrollment.student_id})`}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p>No students enrolled in this course yet.</p>
                      )}
                    </div>
                  )}
                  <div className="course-actions">
                    <button
                      className="small-button"
                      onClick={() => editCourse(course)}
                    >
                      Edit
                    </button>
                    <button
                      className="small-button danger-button"
                      onClick={() => deleteCourse(course.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {!courses.length && (
                <div className="empty-state">
                  No courses found. Add your first course above.
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="footer">
          Student Management System · Microservices Architecture
        </footer>
      </main>
    </div>
  );
}
