import { useState, useEffect, useCallback, memo, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy,
    updateDoc,
    getDoc,
    deleteDoc,
} from "firebase/firestore";
import {
    Sun,
    Moon,
    Plus,
    CheckCircle,
    XCircle,
    Pencil,
    Trash2,
    Megaphone,
} from "lucide-react";

// Main App Component
const App = () => {
    // State variables for authentication, data, and UI
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [routine, setRoutine] = useState([]);
    const [events, setEvents] = useState([]);
    const [notices, setNotices] = useState([]); // New state for notices
    const [view, setView] = useState("routine");
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [showRoutineForm, setShowRoutineForm] = useState(false);
    const [showImportForm, setShowImportForm] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);
    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [showStudentInfoForm, setShowStudentInfoForm] = useState(false);
    const [missedClassesCount, setMissedClassesCount] = useState({});
    const [missedByTeacherCount, setMissedByTeacherCount] = useState({});
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [studentInfo, setStudentInfo] = useState({
        rollNumber: "",
        department: "",
        section: "",
        isCR: false,
    });

    // Form data states
    const [newRoutineDay, setNewRoutineDay] = useState("");
    const [newRoutineTime, setNewRoutineTime] = useState("");
    const [newRoutineCourse, setNewRoutineCourse] = useState("");
    const [jsonInput, setJsonInput] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedRoutine, setSelectedRoutine] = useState(null);

    // Form data states for events and notices
    const eventNameRef = useRef("");
    const eventDateRef = useRef("");
    const eventTimeRef = useRef("");
    const eventCourseRef = useRef("");
    const eventTypeRef = useRef("");

    const courseNameRef = useRef("");
    const courseTeacherRef = useRef("");

    const noticeTitleRef = useRef("");
    const noticeContentRef = useRef("");

    const [editingCourse, setEditingCourse] = useState(null);
    const [editCourseName, setEditCourseName] = useState("");
    const [editCourseTeacher, setEditCourseTeacher] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);

    // Get Firebase configuration and app ID from environment variables
    

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Set up authentication listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(
                    db,
                    `artifacts/${appId}/users/${currentUser.uid}/info/profile`
                );
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setStudentInfo(userDocSnap.data());
                    setShowStudentInfoForm(false);
                } else {
                    setShowStudentInfoForm(true);
                }
            } else {
                setUser(null);
                setShowStudentInfoForm(false);
                setStudentInfo({ rollNumber: "", department: "", section: "" });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [auth, db, appId]);

    // Dark mode effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    // Data fetching and real-time listeners
    useEffect(() => {
        if (!user || !studentInfo.rollNumber) return;

        // Listener for courses
        const coursesRef = collection(
            db,
            `artifacts/${appId}/users/${user.uid}/courses`
        );
        const unsubscribeCourses = onSnapshot(coursesRef, (snapshot) => {
            const fetchedCourses = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setCourses(fetchedCourses);
        });

        // Listener for routine
        const routineRef = collection(
            db,
            `artifacts/${appId}/users/${user.uid}/routine`
        );
        const unsubscribeRoutine = onSnapshot(routineRef, (snapshot) => {
            const fetchedRoutine = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            // Sort routine by time
            fetchedRoutine.sort((a, b) => {
                const [aHour, aMinute] = a.time.split(":").map(Number);
                const [bHour, bMinute] = b.time.split(":").map(Number);
                if (aHour !== bHour) return aHour - bHour;
                return aMinute - bMinute;
            });
            setRoutine(fetchedRoutine);
        });

        // Listener for events
        const eventsRef = collection(
            db,
            `artifacts/${appId}/users/${user.uid}/events`
        );
        const unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
            const fetchedEvents = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setEvents(fetchedEvents);
        });

        // Listener for notices
        const noticesRef = collection(
            db,
            `artifacts/${appId}/public/notices/${studentInfo.department}_${studentInfo.section}`
        );
        const unsubscribeNotices = onSnapshot(noticesRef, (snapshot) => {
            const fetchedNotices = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setNotices(fetchedNotices);
        });

        // Listener for missed classes count
        const analyticsCourseDocRef = doc(
            db,
            `artifacts/${appId}/users/${user.uid}/analytics/missedClasses`
        );
        const unsubscribeMissedCourses = onSnapshot(
            analyticsCourseDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setMissedClassesCount(docSnap.data());
                } else {
                    setMissedClassesCount({});
                }
            }
        );

        // Listener for missed classes by teacher count
        const analyticsTeacherDocRef = doc(
            db,
            `artifacts/${appId}/users/${user.uid}/analytics/missedByTeacher`
        );
        const unsubscribeMissedTeachers = onSnapshot(
            analyticsTeacherDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setMissedByTeacherCount(docSnap.data());
                } else {
                    setMissedByTeacherCount({});
                }
            }
        );

        // Listener for leaderboard
        const leaderboardRef = collection(
            db,
            `artifacts/${appId}/public/leaderboards/${studentInfo.department}_${studentInfo.section}`
        );
        const qLeaderboard = query(leaderboardRef);
        const unsubscribeLeaderboard = onSnapshot(qLeaderboard, (snapshot) => {
            const fetchedLeaderboard = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            // Sort in memory to avoid index requirement
            fetchedLeaderboard.sort((a, b) => b.totalMissed - a.totalMissed);
            setLeaderboardData(fetchedLeaderboard);
        });

        return () => {
            unsubscribeCourses();
            unsubscribeRoutine();
            unsubscribeEvents();
            unsubscribeNotices();
            unsubscribeMissedCourses();
            unsubscribeMissedTeachers();
            unsubscribeLeaderboard();
        };
    }, [
        user,
        db,
        appId,
        studentInfo.rollNumber,
        studentInfo.department,
        studentInfo.section,
    ]);

    // Google Sign-in handler
    const handleGoogleSignIn = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error during Google Sign-in:", error.message);
        }
    };

    // Sign-out handler
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            // Clear local state on sign-out
            setCourses([]);
            setRoutine([]);
            setEvents([]);
            setNotices([]);
            setMissedClassesCount({});
            setMissedByTeacherCount({});
            setLeaderboardData([]);
            setStudentInfo({ rollNumber: "", department: "", section: "" });
        } catch (error) {
            console.error("Error signing out:", error.message);
        }
    };

    // Add student info to Firestore
    const handleStudentInfoSubmit = async (e) => {
        e.preventDefault();
        if (
            !studentInfo.rollNumber ||
            !studentInfo.department ||
            !studentInfo.section
        )
            return;
        if (!user) return;
        try {
            const userDocRef = doc(
                db,
                `artifacts/${appId}/users/${user.uid}/info/profile`
            );
            await setDoc(userDocRef, studentInfo);
            setShowStudentInfoForm(false);
        } catch (error) {
            console.error("Error saving student info:", error);
        }
    };

    // Add a new course to Firestore
    const addCourse = async (e) => {
        e.preventDefault();
        const courseName = courseNameRef.current.value.trim();
        const courseTeacher = courseTeacherRef.current.value.trim();

        if (courseName === "") return;
        if (!user) return;

        try {
            const courseDocRef = doc(
                db,
                `artifacts/${appId}/users/${user.uid}/courses`,
                courseName
            );
            await setDoc(courseDocRef, {
                name: courseName,
                teacher: courseTeacher,
            });
            courseNameRef.current.value = "";
            courseTeacherRef.current.value = "";
            setShowCourseForm(false);
        } catch (error) {
            console.error("Error adding course:", error);
        }
    };

    // Edit course in Firestore
    const handleEditCourse = async (e) => {
        e.preventDefault();
        if (editCourseName.trim() === "") return;
        if (!user || !editingCourse) return;

        try {
            const courseDocRef = doc(
                db,
                `artifacts/${appId}/users/${user.uid}/courses`,
                editingCourse.id
            );
            await updateDoc(courseDocRef, {
                name: editCourseName.trim(),
                teacher: editCourseTeacher.trim(),
            });
            setEditingCourse(null);
        } catch (error) {
            console.error("Error editing course:", error);
        }
    };

    // Delete course from Firestore
    const handleDeleteCourse = async () => {
        if (!user || !courseToDelete) return;

        try {
            // Delete the course document
            const courseDocRef = doc(
                db,
                `artifacts/${appId}/users/${user.uid}/courses`,
                courseToDelete.id
            );
            await deleteDoc(courseDocRef);

            // You might also want to delete related routine entries
            // For simplicity, let's just update the local state for now
            const updatedRoutine = routine.filter(
                (item) => item.courseId !== courseToDelete.id
            );
            setRoutine(updatedRoutine);

            setShowDeleteModal(false);
            setCourseToDelete(null);
        } catch (error) {
            console.error("Error deleting course:", error);
        }
    };

    // Add a new routine entry to Firestore
    const addRoutineEntry = async (e) => {
        e.preventDefault();
        if (!newRoutineDay || !newRoutineTime || !newRoutineCourse) return;
        if (!user) return;

        try {
            const courseInfo = courses.find((c) => c.id === newRoutineCourse);
            const routineDocRef = doc(
                collection(db, `artifacts/${appId}/users/${user.uid}/routine`)
            );
            await setDoc(routineDocRef, {
                day: newRoutineDay,
                time: newRoutineTime,
                courseId: newRoutineCourse,
                courseName: courseInfo?.name || "N/A",
                courseTeacher: courseInfo?.teacher || "N/A",
            });
            setNewRoutineDay("");
            setNewRoutineTime("");
            setNewRoutineCourse("");
            setShowRoutineForm(false);
        } catch (error) {
            console.error("Error adding routine entry:", error);
        }
    };

    // Add new event to Firestore
    const addEvent = async (e) => {
        e.preventDefault();
        const eventName = eventNameRef.current.value.trim();
        const eventDate = eventDateRef.current.value.trim();
        const eventTime = eventTimeRef.current.value.trim();
        const eventCourse = eventCourseRef.current.value.trim();
        const eventType = eventTypeRef.current.value.trim();

        if (!eventName || !eventDate || !eventType) return;
        if (!user) return;

        try {
            const eventsRef = collection(
                db,
                `artifacts/${appId}/users/${user.uid}/events`
            );
            await setDoc(doc(eventsRef), {
                name: eventName,
                date: eventDate,
                time: eventTime,
                type: eventType,
                courseId: eventCourse || "N/A",
            });
            eventNameRef.current.value = "";
            eventDateRef.current.value = "";
            eventTimeRef.current.value = "";
            eventCourseRef.current.value = "";
            eventTypeRef.current.value = "";
            setShowEventForm(false);
        } catch (error) {
            console.error("Error adding event:", error);
        }
    };

    // Add new notice to Firestore
    const addNotice = async (e) => {
        e.preventDefault();
        const noticeTitle = noticeTitleRef.current.value.trim();
        const noticeContent = noticeContentRef.current.value.trim();

        if (!noticeTitle || !noticeContent) return;
        if (!user || !studentInfo.isCR) return;

        try {
            const noticesRef = collection(
                db,
                `artifacts/${appId}/public/notices/${studentInfo.department}_${studentInfo.section}`
            );
            await setDoc(doc(noticesRef), {
                title: noticeTitle,
                content: noticeContent,
                author: user.displayName,
                timestamp: new Date().toISOString(),
            });
            noticeTitleRef.current.value = "";
            noticeContentRef.current.value = "";
            setShowNoticeForm(false);
        } catch (error) {
            console.error("Error adding notice:", error);
        }
    };

    // Handle JSON import
    const handleJsonImport = async (e) => {
        e.preventDefault();
        if (!jsonInput || !user) return;

        try {
            const data = JSON.parse(jsonInput);
            if (!Array.isArray(data)) {
                console.error("Invalid JSON format. Expected an array.");
                return;
            }

            for (const entry of data) {
                if (entry.courseName && entry.day && entry.time) {
                    const existingCourse = courses.find(
                        (c) => c.name === entry.courseName
                    );
                    if (existingCourse) {
                        const routineDocRef = doc(
                            collection(
                                db,
                                `artifacts/${appId}/users/${user.uid}/routine`
                            )
                        );
                        await setDoc(routineDocRef, {
                            day: entry.day,
                            time: entry.time,
                            courseId: existingCourse.id,
                            courseName: existingCourse.name,
                            courseTeacher: existingCourse.teacher || "N/A",
                        });
                    } else {
                        const newCourseId = entry.courseName.trim();
                        const courseDocRef = doc(
                            db,
                            `artifacts/${appId}/users/${user.uid}/courses`,
                            newCourseId
                        );
                        await setDoc(courseDocRef, {
                            name: newCourseId,
                            teacher: entry.courseTeacher || "N/A",
                        });

                        const routineDocRef = doc(
                            collection(
                                db,
                                `artifacts/${appId}/users/${user.uid}/routine`
                            )
                        );
                        await setDoc(routineDocRef, {
                            day: entry.day,
                            time: entry.time,
                            courseId: newCourseId,
                            courseName: newCourseId,
                            courseTeacher: entry.courseTeacher || "N/A",
                        });
                    }
                }
            }
            setJsonInput("");
            setShowImportForm(false);
        } catch (error) {
            console.error("Error importing JSON:", error);
        }
    };

    // Mark a class as missed or attended
    const markClassStatus = async (routineItem, date, status) => {
        if (!user) return;

        const classId = `${routineItem.id}-${date}`;
        const attendanceDocRef = doc(
            db,
            `artifacts/${appId}/users/${user.uid}/attendance`,
            classId
        );
        const analyticsCourseDocRef = doc(
            db,
            `artifacts/${appId}/users/${user.uid}/analytics/missedClasses`
        );
        const analyticsTeacherDocRef = doc(
            db,
            `artifacts/${appId}/users/${user.uid}/analytics/missedByTeacher`
        );
        const leaderboardDocRef = doc(
            db,
            `artifacts/${appId}/public/leaderboards/${studentInfo.department}_${studentInfo.section}`,
            user.uid
        );

        try {
            // Get current state of the class instance
            const attendanceDocSnap = await getDoc(attendanceDocRef);
            const currentStatus = attendanceDocSnap.exists()
                ? attendanceDocSnap.data().status
                : null;

            // Get current analytics counts
            const currentCourseCount =
                missedClassesCount[routineItem.courseId] || 0;
            const currentTeacherCount =
                missedByTeacherCount[routineItem.courseTeacher] || 0;
            const currentTotalMissed = Object.values(missedClassesCount).reduce(
                (sum, count) => sum + count,
                0
            );

            // Calculate new counts based on status change
            let newCourseCount = currentCourseCount;
            let newTeacherCount = currentTeacherCount;
            let newTotalMissed = currentTotalMissed;

            if (status === "missed" && currentStatus !== "missed") {
                newCourseCount++;
                newTeacherCount++;
                newTotalMissed++;
            } else if (status === "attended" && currentStatus === "missed") {
                newCourseCount = Math.max(0, newCourseCount - 1);
                newTeacherCount = Math.max(0, newTeacherCount - 1);
                newTotalMissed = Math.max(0, newTotalMissed - 1);
            }

            // Update attendance document
            await setDoc(
                attendanceDocRef,
                {
                    routineId: routineItem.id,
                    date,
                    courseName: routineItem.courseName,
                    courseId: routineItem.courseId,
                    courseTeacher: routineItem.courseTeacher || "N/A",
                    status,
                    timestamp: new Date().toISOString(),
                },
                { merge: true }
            );

            // Update analytics documents (course & teacher)
            await setDoc(
                analyticsCourseDocRef,
                { [routineItem.courseId]: newCourseCount },
                { merge: true }
            );
            await setDoc(
                analyticsTeacherDocRef,
                { [routineItem.courseTeacher]: newTeacherCount },
                { merge: true }
            );

            // Update leaderboard document
            await setDoc(
                leaderboardDocRef,
                {
                    displayName: user.displayName,
                    totalMissed: newTotalMissed,
                    department: studentInfo.department,
                    section: studentInfo.section,
                    rollNumber: studentInfo.rollNumber,
                },
                { merge: true }
            );

            // Close the modal
            setSelectedRoutine(null);
            setSelectedDate("");
        } catch (error) {
            console.error("Error updating class status:", error);
        }
    };

    // Component for the Course Form
    const CourseForm = memo(
        ({ addCourse, courseNameRef, courseTeacherRef }) => {
            return (
                <div className="p-6 mb-8 bg-gray-200 rounded-2xl shadow-xl dark:bg-gray-700 transition-colors duration-300">
                    <form onSubmit={addCourse}>
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Add New Course
                        </h3>
                        <input
                            type="text"
                            ref={courseNameRef}
                            placeholder="Course Name (e.g., Biology 101)"
                            className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                        />
                        <input
                            type="text"
                            ref={courseTeacherRef}
                            placeholder="Teacher Name (e.g., Prof. Smith)"
                            className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                        />
                        <button
                            type="submit"
                            className="w-full px-4 py-2 font-semibold text-white transition-colors rounded-xl bg-indigo-500 hover:bg-indigo-600"
                        >
                            Save Course
                        </button>
                    </form>
                </div>
            );
        }
    );

    // Component for the Edit Course Modal
    const EditCourseModal = memo(
        ({
            editingCourse,
            setEditingCourse,
            editCourseName,
            setEditCourseName,
            editCourseTeacher,
            setEditCourseTeacher,
            handleEditCourse,
        }) => {
            if (!editingCourse) return null;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Edit Course
                        </h3>
                        <form onSubmit={handleEditCourse}>
                            <input
                                type="text"
                                value={editCourseName}
                                onChange={(e) =>
                                    setEditCourseName(e.target.value)
                                }
                                placeholder="Course Name"
                                className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white"
                            />
                            <input
                                type="text"
                                value={editCourseTeacher}
                                onChange={(e) =>
                                    setEditCourseTeacher(e.target.value)
                                }
                                placeholder="Teacher Name"
                                className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white"
                            />
                            <div className="flex justify-between space-x-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCourse(null)}
                                    className="flex-1 px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-600 dark:text-white hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }
    );

    // Component for the Delete Confirmation Modal
    const DeleteCourseModal = memo(
        ({
            showDeleteModal,
            setShowDeleteModal,
            courseToDelete,
            handleDeleteCourse,
        }) => {
            if (!showDeleteModal) return null;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
                        <h3 className="mb-4 text-xl font-bold text-red-500">
                            Delete Course
                        </h3>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete the course "
                            {courseToDelete?.name}"? This action cannot be
                            undone.
                        </p>
                        <div className="flex justify-between space-x-4">
                            <button
                                onClick={handleDeleteCourse}
                                className="flex-1 px-4 py-2 font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600"
                            >
                                Confirm Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-600 dark:text-white hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    );

    // Component for the Routine Form
    const RoutineForm = memo(
        ({
            newRoutineDay,
            setNewRoutineDay,
            newRoutineTime,
            setNewRoutineTime,
            newRoutineCourse,
            setNewRoutineCourse,
            addRoutineEntry,
            courses,
            daysOfWeek,
            setShowImportForm,
            showImportForm,
        }) => {
            return (
                <div className="p-6 mb-8 bg-gray-200 rounded-2xl shadow-xl dark:bg-gray-700 transition-colors duration-300">
                    <form onSubmit={addRoutineEntry}>
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Add Routine Entry
                        </h3>
                        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
                            <select
                                value={newRoutineDay}
                                onChange={(e) =>
                                    setNewRoutineDay(e.target.value)
                                }
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-300"
                            >
                                <option value="">Select Day</option>
                                {daysOfWeek.map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="time"
                                value={newRoutineTime}
                                onChange={(e) =>
                                    setNewRoutineTime(e.target.value)
                                }
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-300"
                            />
                            <select
                                value={newRoutineCourse}
                                onChange={(e) =>
                                    setNewRoutineCourse(e.target.value)
                                }
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus-ring-purple-500 transition-colors duration-300"
                            >
                                <option value="">Select Course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <button
                                type="submit"
                                className="w-full px-4 py-2 font-semibold text-white transition-colors rounded-xl bg-purple-500 hover:bg-purple-600"
                            >
                                Save Routine
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImportForm(!showImportForm);
                                    setShowCourseForm(false);
                                    setShowRoutineForm(false);
                                    setShowEventForm(false);
                                }}
                                className="ml-4 px-4 py-2 text-sm font-semibold text-white transition-all rounded-xl bg-teal-600 hover:bg-teal-700 shadow-md flex items-center justify-center space-x-2"
                            >
                                <Plus size={18} />
                                <span>
                                    {showImportForm
                                        ? "Hide Import"
                                        : "Import Routine"}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            );
        }
    );

    // Component for the Event Form
    const EventForm = memo(
        ({
            courses,
            addEvent,
            eventNameRef,
            eventDateRef,
            eventTimeRef,
            eventCourseRef,
            eventTypeRef,
        }) => {
            return (
                <div className="p-6 mb-8 bg-gray-200 rounded-2xl shadow-xl dark:bg-gray-700 transition-colors duration-300">
                    <form onSubmit={addEvent}>
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Add New Event
                        </h3>
                        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                            <select
                                ref={eventTypeRef}
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                required
                            >
                                <option value="">Select Event Type</option>
                                <option value="Assignment">Assignment</option>
                                <option value="CT Exam">CT Exam</option>
                                <option value="Presentation">
                                    Presentation
                                </option>
                                <option value="Other">Other</option>
                            </select>
                            <input
                                type="text"
                                ref={eventNameRef}
                                placeholder="Event Name/Description"
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                required
                            />
                            <input
                                type="date"
                                ref={eventDateRef}
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                required
                            />
                            <input
                                type="time"
                                ref={eventTimeRef}
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                            <select
                                ref={eventCourseRef}
                                className="w-full px-4 py-2 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                                <option value="">
                                    Select Associated Course (Optional)
                                </option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 font-semibold text-white transition-colors rounded-xl bg-yellow-500 hover:bg-yellow-600"
                        >
                            Save Event
                        </button>
                    </form>
                </div>
            );
        }
    );

    // Component for the Notice Form
    const NoticeForm = memo(
        ({ addNotice, noticeTitleRef, noticeContentRef }) => {
            return (
                <div className="p-6 mb-8 bg-gray-200 rounded-2xl shadow-xl dark:bg-gray-700 transition-colors duration-300">
                    <form onSubmit={addNotice}>
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Create New Notice
                        </h3>
                        <input
                            type="text"
                            ref={noticeTitleRef}
                            placeholder="Notice Title"
                            className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                            required
                        />
                        <textarea
                            ref={noticeContentRef}
                            placeholder="Notice Content"
                            rows="4"
                            className="w-full px-4 py-2 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                            required
                        ></textarea>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 font-semibold text-white transition-colors rounded-xl bg-blue-500 hover:bg-blue-600"
                        >
                            Publish Notice
                        </button>
                    </form>
                </div>
            );
        }
    );

    // Component for the JSON Import Form
    const ImportForm = memo(({ jsonInput, setJsonInput, handleJsonImport }) => {
        return (
            <div className="p-6 mb-8 bg-gray-200 rounded-2xl shadow-xl dark:bg-gray-700 transition-colors duration-300">
                <form onSubmit={handleJsonImport}>
                    <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                        Import Routine from JSON
                    </h3>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`Paste your JSON routine here.
Example format:
[
  { "courseName": "History", "day": "Monday", "time": "10:00", "courseTeacher": "Ms. Jones" },
  { "courseName": "Math", "day": "Tuesday", "time": "14:30", "courseTeacher": "Mr. Lee" }
]
*Note: Make sure the courseName matches an existing course, or it will be created.`}
                        rows="6"
                        className="w-full p-4 mb-4 text-gray-800 rounded-xl dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-300"
                    ></textarea>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-semibold text-white transition-colors rounded-xl bg-teal-500 hover:bg-teal-600"
                    >
                        Import Routine
                    </button>
                </form>
            </div>
        );
    });

    // Render loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
                <div className="text-xl text-gray-700 dark:text-gray-300">
                    Loading...
                </div>
            </div>
        );
    }

    // Render login screen if no user
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
                <div className="w-full max-w-md p-8 text-center bg-white rounded-2xl shadow-2xl dark:bg-gray-800 transition-colors duration-300">
                    <h1 className="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-100">
                        Alibi
                    </h1>
                    <p className="mb-8 text-gray-600 dark:text-gray-300">
                        Sign in to keep track of your classes and attendance.
                    </p>
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full px-6 py-3 text-lg font-semibold text-white transition-all transform rounded-2xl bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 active:scale-95 shadow-lg"
                    >
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    // Render student info form if data is missing
    if (showStudentInfoForm) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
                <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl dark:bg-gray-800 transition-colors duration-300">
                    <h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">
                        Tell us about yourself
                    </h2>
                    <form onSubmit={handleStudentInfoSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300">
                                Roll Number
                            </label>
                            <input
                                type="text"
                                value={studentInfo.rollNumber}
                                onChange={(e) =>
                                    setStudentInfo({
                                        ...studentInfo,
                                        rollNumber: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-2 rounded-xl text-gray-800 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300">
                                Department
                            </label>
                            <input
                                type="text"
                                value={studentInfo.department}
                                onChange={(e) =>
                                    setStudentInfo({
                                        ...studentInfo,
                                        department: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-2 rounded-xl text-gray-800 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-gray-300">
                                Section
                            </label>
                            <input
                                type="text"
                                value={studentInfo.section}
                                onChange={(e) =>
                                    setStudentInfo({
                                        ...studentInfo,
                                        section: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-2 rounded-xl text-gray-800 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="flex items-center mb-6">
                            <input
                                type="checkbox"
                                id="isCr"
                                checked={studentInfo.isCR}
                                onChange={(e) =>
                                    setStudentInfo({
                                        ...studentInfo,
                                        isCR: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                                htmlFor="isCr"
                                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                            >
                                I am a Class Representative
                            </label>
                        </div>
                        <button
                            type="submit"
                            className="w-full px-6 py-3 text-lg font-semibold text-white transition-all transform rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg"
                        >
                            Save Info
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Routine View Component
    const RoutineView = () => {
        const daysOfWeek = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ];
        const uniqueTimes = [
            ...new Set(routine.map((item) => item.time)),
        ].sort();

        // Check if user has uploaded any data
        const hasData = courses.length > 0 || routine.length > 0;

        // Function to handle class item click
        const handleRoutineItemClick = (item) => {
            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const dayOfMonth = String(today.getDate()).padStart(2, "0");
            const todayDate = `${year}-${month}-${dayOfMonth}`;

            setSelectedRoutine(item);
            setSelectedDate(todayDate);
        };

        // This modal will be shown when a user clicks on a routine item
        const ClassModal = ({ routineItem, date }) => {
            if (!routineItem) return null;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800 transition-colors duration-300">
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
                            Mark Class Status
                        </h3>
                        <p className="mb-2 text-gray-600 dark:text-gray-300">
                            Course:{" "}
                            <span className="font-semibold">
                                {routineItem.courseName}
                            </span>
                        </p>
                        <p className="mb-4 text-gray-600 dark:text-gray-300">
                            Day: {routineItem.day}, Time: {routineItem.time}
                        </p>
                        <div className="flex justify-between space-x-4">
                            <button
                                onClick={() =>
                                    markClassStatus(
                                        routineItem,
                                        date,
                                        "attended"
                                    )
                                }
                                className="flex-1 px-4 py-2 font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors duration-300 flex items-center justify-center space-x-2"
                            >
                                <CheckCircle size={18} />
                                <span>Attended</span>
                            </button>
                            <button
                                onClick={() =>
                                    markClassStatus(routineItem, date, "missed")
                                }
                                className="flex-1 px-4 py-2 font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-300 flex items-center justify-center space-x-2"
                            >
                                <XCircle size={18} />
                                <span>Missed</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedRoutine(null)}
                            className="w-full mt-4 px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            );
        };

        const getOngoingClassStyle = (routineTime) => {
            const now = new Date();
            const [hours, minutes] = routineTime.split(":").map(Number);
            const classStartTime = new Date();
            classStartTime.setHours(hours, minutes, 0, 0);

            // Assuming a class duration of 1 hour
            const classEndTime = new Date(
                classStartTime.getTime() + 60 * 60 * 1000
            );

            if (now >= classStartTime && now <= classEndTime) {
                return "bg-yellow-400 border-2 border-yellow-600 text-black animate-pulse";
            }
            return "";
        };

        return (
            <div className="p-4 md:p-8">
                {selectedRoutine && (
                    <ClassModal
                        routineItem={selectedRoutine}
                        date={selectedDate}
                    />
                )}

                {/* Notices Section */}
                {notices.length > 0 && (
                    <div className="mb-8 p-6 bg-yellow-100 dark:bg-yellow-900 rounded-2xl shadow-xl transition-colors duration-300">
                        <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
                            <Megaphone
                                size={24}
                                className="text-yellow-700 dark:text-yellow-300"
                            />
                            <span>
                                Announcements for {studentInfo.department}-
                                {studentInfo.section}
                            </span>
                        </h3>
                        {notices.map((notice) => (
                            <div
                                key={notice.id}
                                className="mb-4 p-4 rounded-xl bg-yellow-200/50 dark:bg-yellow-800/50"
                            >
                                <p className="font-bold text-gray-800 dark:text-gray-100">
                                    {notice.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {notice.content}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Posted by {notice.author} on{" "}
                                    {new Date(
                                        notice.timestamp
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Routine Management Buttons */}
                <div className="flex flex-col items-center justify-center mb-6 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={() => {
                            setShowCourseForm(!showCourseForm);
                            setShowRoutineForm(false);
                            setShowImportForm(false);
                            setShowEventForm(false);
                            setShowNoticeForm(false);
                        }}
                        className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white transition-all rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center justify-center space-x-2"
                    >
                        <Plus size={20} />
                        <span>
                            {showCourseForm ? "Hide Form" : "Add a Course"}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setShowRoutineForm(!showRoutineForm);
                            setShowCourseForm(false);
                            setShowImportForm(false);
                            setShowEventForm(false);
                            setShowNoticeForm(false);
                        }}
                        className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white transition-all rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-md flex items-center justify-center space-x-2"
                    >
                        <Plus size={20} />
                        <span>
                            {showRoutineForm
                                ? "Hide Form"
                                : "Add a Routine Entry"}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setShowEventForm(!showEventForm);
                            setShowCourseForm(false);
                            setShowRoutineForm(false);
                            setShowImportForm(false);
                            setShowNoticeForm(false);
                        }}
                        className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white transition-all rounded-2xl bg-yellow-600 hover:bg-yellow-700 shadow-md flex items-center justify-center space-x-2"
                    >
                        <Plus size={20} />
                        <span>
                            {showEventForm ? "Hide Form" : "Add an Event"}
                        </span>
                    </button>
                    {studentInfo.isCR && (
                        <button
                            onClick={() => {
                                setShowNoticeForm(!showNoticeForm);
                                setShowCourseForm(false);
                                setShowRoutineForm(false);
                                setShowImportForm(false);
                                setShowEventForm(false);
                            }}
                            className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white transition-all rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center space-x-2"
                        >
                            <Megaphone size={20} />
                            <span>
                                {showNoticeForm ? "Hide Form" : "Add a Notice"}
                            </span>
                        </button>
                    )}
                </div>

                {/* Course Form */}
                {showCourseForm && (
                    <CourseForm
                        {...{ addCourse, courseNameRef, courseTeacherRef }}
                    />
                )}

                {/* Routine Form */}
                {showRoutineForm && (
                    <RoutineForm
                        {...{
                            newRoutineDay,
                            setNewRoutineDay,
                            newRoutineTime,
                            setNewRoutineTime,
                            newRoutineCourse,
                            setNewRoutineCourse,
                            addRoutineEntry,
                            courses,
                            daysOfWeek,
                            setShowImportForm,
                            showImportForm,
                        }}
                    />
                )}

                {/* Event Form */}
                {showEventForm && (
                    <EventForm
                        {...{
                            courses,
                            addEvent,
                            eventNameRef,
                            eventDateRef,
                            eventTimeRef,
                            eventCourseRef,
                            eventTypeRef,
                        }}
                    />
                )}

                {/* Notice Form */}
                {showNoticeForm && studentInfo.isCR && (
                    <NoticeForm
                        {...{ addNotice, noticeTitleRef, noticeContentRef }}
                    />
                )}

                {/* Import Routine Form */}
                {showImportForm && (
                    <ImportForm
                        {...{ jsonInput, setJsonInput, handleJsonImport }}
                    />
                )}

                {/* Course List */}
                <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                    Your Courses
                </h2>
                <div className="flex flex-wrap gap-4 mb-8">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            className="relative p-4 text-center text-white rounded-xl shadow-md bg-green-500 group"
                        >
                            <p className="font-bold">{course.name}</p>
                            <p className="text-sm">{course.teacher}</p>
                            <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-green-500/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditingCourse(course);
                                        setEditCourseName(course.name);
                                        setEditCourseTeacher(course.teacher);
                                    }}
                                    className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setCourseToDelete(course);
                                        setShowDeleteModal(true);
                                    }}
                                    className="p-2 text-white bg-red-600 rounded-full hover:bg-red-700"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {courses.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400">
                            No courses added yet.
                        </p>
                    )}
                </div>

                {/* Weekly Routine Grid */}
                <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                    Weekly Routine
                </h2>
                {routine.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                        No routine entries added yet. Add some to see your
                        schedule.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl shadow-xl transition-colors duration-300">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                                        Time
                                    </th>
                                    {daysOfWeek.map((day) => (
                                        <th
                                            key={day}
                                            className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400"
                                        >
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {uniqueTimes.map((time) => (
                                    <tr key={time}>
                                        <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">
                                            {time}
                                        </td>
                                        {daysOfWeek.map((day) => {
                                            const routineItem = routine.find(
                                                (item) =>
                                                    item.day === day &&
                                                    item.time === time
                                            );
                                            const ongoingClassStyle =
                                                routineItem
                                                    ? getOngoingClassStyle(
                                                          routineItem.time
                                                      )
                                                    : "";
                                            return (
                                                <td
                                                    key={day}
                                                    className="p-2 md:px-6 md:py-4"
                                                >
                                                    {routineItem ? (
                                                        <div
                                                            onClick={() =>
                                                                handleRoutineItemClick(
                                                                    routineItem
                                                                )
                                                            }
                                                            className={`p-3 text-sm font-semibold text-center text-white transition-all rounded-xl shadow-md cursor-pointer bg-blue-500 hover:bg-blue-600 hover:scale-105 ${ongoingClassStyle}`}
                                                        >
                                                            {
                                                                routineItem.courseName
                                                            }
                                                            <br />
                                                            <span className="text-xs font-normal opacity-75">
                                                                {
                                                                    routineItem.courseTeacher
                                                                }
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="h-10"></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Events List */}
                <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                    Upcoming Events
                </h2>
                <div className="flex flex-wrap gap-4">
                    {events.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">
                            No events added yet.
                        </p>
                    ) : (
                        events.map((event) => (
                            <div
                                key={event.id}
                                className="p-4 text-center text-white rounded-xl shadow-md bg-yellow-500"
                            >
                                <p className="font-bold">{event.name}</p>
                                <p className="text-sm">{event.type}</p>
                                <p className="text-sm">
                                    {event.date} at {event.time}
                                </p>
                                {event.courseId !== "N/A" && (
                                    <p className="text-sm opacity-75">
                                        Course:{" "}
                                        {
                                            courses.find(
                                                (c) => c.id === event.courseId
                                            )?.name
                                        }
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    // Summary View Component
    const SummaryView = () => {
        const totalMissed = Object.values(missedClassesCount).reduce(
            (sum, count) => sum + count,
            0
        );

        return (
            <div className="p-4 md:p-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                    Summary of Missed Classes
                </h2>
                {Object.keys(missedClassesCount).length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                        No missed classes recorded yet. Mark a class as missed
                        in the routine view to see it here.
                    </p>
                ) : (
                    <>
                        <div className="p-6 mb-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800 text-center transition-colors duration-300">
                            <h3 className="text-lg text-gray-600 dark:text-gray-400">
                                Total missed classes:
                            </h3>
                            <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                                {totalMissed}
                            </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-6 bg-white rounded-2xl shadow-md dark:bg-gray-800 transition-colors duration-300">
                                <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
                                    By Course
                                </h3>
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0 dark:border-gray-700"
                                    >
                                        <span className="text-gray-600 dark:text-gray-300">
                                            {course.name}
                                        </span>
                                        <span className="font-semibold text-red-500">
                                            {missedClassesCount[course.id] || 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-white rounded-2xl shadow-md dark:bg-gray-800 transition-colors duration-300">
                                <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
                                    By Teacher
                                </h3>
                                {Object.keys(missedByTeacherCount).length ===
                                0 ? (
                                    <p className="text-gray-500 text-sm dark:text-gray-400">
                                        No teacher data available yet.
                                    </p>
                                ) : (
                                    Object.keys(missedByTeacherCount).map(
                                        (teacherName) => (
                                            <div
                                                key={teacherName}
                                                className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0 dark:border-gray-700"
                                            >
                                                <span className="text-gray-600 dark:text-gray-300">
                                                    {teacherName}
                                                </span>
                                                <span className="font-semibold text-red-500">
                                                    {
                                                        missedByTeacherCount[
                                                            teacherName
                                                        ]
                                                    }
                                                </span>
                                            </div>
                                        )
                                    )
                                )}
                            </div>
                        </div>
                        <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                            Leaderboard
                        </h2>
                        <div className="p-6 bg-white rounded-2xl shadow-md dark:bg-gray-800 transition-colors duration-300">
                            {leaderboardData.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">
                                    No leaderboard data yet for your section.
                                    Check back later!
                                </p>
                            ) : (
                                <ol className="list-decimal list-inside">
                                    {leaderboardData.map((student, index) => (
                                        <li
                                            key={student.id}
                                            className={`flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0 dark:border-gray-700 ${
                                                student.id === user.uid
                                                    ? "font-bold text-blue-600 dark:text-blue-400"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <span>{index + 1}.</span>
                                                <span className="font-bold">
                                                    {student.displayName}
                                                </span>
                                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                    ({student.rollNumber})
                                                </span>
                                            </div>
                                            <span className="font-semibold text-red-500">
                                                {student.totalMissed} missed
                                                classes
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </>
                )}

                {/* Announcements Section in Summary */}
                {notices.length > 0 && (
                    <>
                        <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                            Announcements
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {notices.map((notice) => (
                                <div
                                    key={notice.id}
                                    className="p-6 bg-white rounded-2xl shadow-md dark:bg-gray-800"
                                >
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {notice.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        {notice.content}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Posted by {notice.author} on{" "}
                                        {new Date(
                                            notice.timestamp
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Main App UI
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-white transition-colors duration-300">
            {editingCourse && (
                <EditCourseModal
                    {...{
                        editingCourse,
                        setEditingCourse,
                        editCourseName,
                        setEditCourseName,
                        editCourseTeacher,
                        setEditCourseTeacher,
                        handleEditCourse,
                    }}
                />
            )}
            {showDeleteModal && (
                <DeleteCourseModal
                    {...{
                        showDeleteModal,
                        setShowDeleteModal,
                        courseToDelete,
                        handleDeleteCourse,
                    }}
                />
            )}

            {/* Header/Nav */}
            <header className="sticky top-0 z-10 p-4 shadow-xl bg-white/80 backdrop-blur-md dark:bg-gray-800/80 transition-colors duration-300">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                            Alibi
                        </h1>
                        <nav className="hidden md:flex space-x-2 p-1 rounded-full bg-gray-200 dark:bg-gray-700">
                            <button
                                onClick={() => setView("routine")}
                                className={`px-4 py-2 font-medium rounded-full transition-colors duration-300 ${
                                    view === "routine"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                }`}
                            >
                                Routine
                            </button>
                            <button
                                onClick={() => setView("summary")}
                                className={`px-4 py-2 font-medium rounded-full transition-colors duration-300 ${
                                    view === "summary"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                }`}
                            >
                                Summary
                            </button>
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
                        >
                            {isDarkMode ? (
                                <Sun size={24} />
                            ) : (
                                <Moon size={24} />
                            )}
                        </button>
                        <img
                            src={user.photoURL}
                            alt="User"
                            className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600"
                        />
                        <span className="hidden md:block text-gray-700 dark:text-gray-300">
                            {user.displayName}
                        </span>
                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 font-semibold text-white transition-colors rounded-full bg-red-500 hover:bg-red-600 shadow-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {view === "routine" ? <RoutineView /> : <SummaryView />}
            </main>
        </div>
    );
};

export default App;
