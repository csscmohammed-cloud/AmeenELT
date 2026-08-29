import { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  onSnapshot,
  where,
  updateDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase";
import { Material, Group, Attempt } from "../types";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  BookOpen,
  HelpCircle,
  Layers,
  Trophy,
  Star,
  Target,
  Sparkles,
  Calendar,
  Bell,
  Clock,
  CheckCircle,
  Search,
  X,
  Filter,
} from "lucide-react";
import { FileText, User, Folder } from "lucide-react";
import { FileManager } from "../components/FileManager";
import { Notification } from "../types";
import { AITutor } from "../components/AITutor";
import { ProfileManager } from "../components/ProfileManager";

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const { showAITutor } = useSettings();
  const [myAssignments, setMyAssignments] = useState<Material[]>([]);
  const [libraryMaterials, setLibraryMaterials] = useState<Material[]>([]);
  const [myAttempts, setMyAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "today" | "upcoming" | "completed"
  >("today");
  const [mainTab, setMainTab] = useState<"overview" | "profile" | "files">("overview");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    let currentGroups: Group[] = [];
    let currentMaterials: Material[] = [];

    const updateAssignments = () => {
      const myGroupIds = currentGroups
        .filter((g) => {
          if (g.year && g.year.toLowerCase() !== profile?.year?.toLowerCase()) return false;
          if (g.level && g.level.toLowerCase() !== profile?.section?.toLowerCase()) return false;
          if (g.batch && g.batch.toLowerCase() !== profile?.faculty?.toLowerCase() && g.batch.toLowerCase() !== profile?.department?.toLowerCase()) return false;
          return true;
        })
        .map((g) => g.id);

      const assigned: Material[] = [];
      const openLibrary: Material[] = [];

      currentMaterials.forEach((mat) => {
        const hasGroups = mat.assignedGroups && mat.assignedGroups.length > 0;
        const hasUsers = mat.assignedUsers && mat.assignedUsers.length > 0;

        if (!hasGroups && !hasUsers) {
          openLibrary.push(mat);
          return;
        }

        let matchesGroup = hasGroups ? mat.assignedGroups.some((gId) => myGroupIds.includes(gId)) : false;
        let matchesUser = hasUsers ? mat.assignedUsers.includes(user?.uid || "") : false;

        if (matchesGroup || matchesUser) {
          assigned.push(mat);
        }
      });

      setMyAssignments(assigned);
      setLibraryMaterials(openLibrary);
      setLoading(false);
    };

    
    const notifQ = query(collection(db, 'notifications'), where('userId', '==', profile.uid));
    const unsubNotif = onSnapshot(notifQ, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      notifs.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (err) => {
      console.error("Error fetching notifications:", err);
    });

    const unsubscribeGroups = onSnapshot(collection(db, "groups"), (snap) => {
      currentGroups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Group);
      updateAssignments();
    }, (err) => {
      console.error("Error fetching groups:", err);
      setFetchError("Database error (Quota exceeded or permissions).");
      setLoading(false);
    });

    const unsubscribeMaterials = onSnapshot(query(collection(db, "materials"), orderBy("createdAt", "desc")), (snap) => {
      currentMaterials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Material);
      updateAssignments();
    }, (err) => {
      console.error("Error fetching materials:", err);
      setFetchError("Database error (Quota exceeded or permissions).");
      setLoading(false);
    });

    let unsubscribeAttempts: () => void = () => {};
    if (user?.uid) {
      unsubscribeAttempts = onSnapshot(
        query(collection(db, "attempts"), where("userId", "==", user.uid)),
        (snap) => {
          setMyAttempts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Attempt));
        },
        (err) => {
          console.error("Error fetching attempts:", err);
        }
      );
    }

    return () => {

      unsubscribeGroups();
    unsubNotif();

      unsubscribeMaterials();
      unsubscribeAttempts();
    };
  }, [profile?.uid, profile?.year, profile?.section, profile?.faculty, profile?.department, user?.uid]);

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">Loading dashboard...</div>
    );
  
  if (fetchError)
    return (
      <div className="p-8 text-center text-red-500">{fetchError}</div>
    );

  // Calculate dynamic stats
  const completedIds = new Set(myAttempts.map((a) => a.materialId));
  const pendingAssignments = myAssignments.filter(
    (m) => !completedIds.has(m.id),
  );

  const now = Date.now();
  let overdueCount = 0;
  pendingAssignments.forEach((m) => {
    if (m.dueDate && m.dueDate < now) overdueCount++;
  });

  const completedCount = myAttempts.length;
  // Let's assume a goal of 5 tasks per week just for the UI, or dynamic based on total
  const weeklyGoal = 5;
  const currentProgress = Math.min(completedCount, weeklyGoal);
  const progressPercent = Math.round((currentProgress / weeklyGoal) * 100);

  const IconMap = {
    quiz: HelpCircle,
    course: BookOpen,
    pronunciation: Sparkles,
  };

  // Filter materials based on search query and selected material type
  const filterMaterial = (mat: Material) => {
    if (selectedType !== "all") {
      if (selectedType === "flashcards") {
        const isFlashcardType =
          (mat.type as string) === "flashcards" ||
          (mat.type as string) === "flashcard";
        const hasModuleFlashcards =
          mat.content?.modules &&
          Array.isArray(mat.content.modules) &&
          mat.content.modules.some(
            (mod: any) => mod.flashcards && mod.flashcards.length > 0,
          );
        if (!isFlashcardType && !hasModuleFlashcards) return false;
      } else if (mat.type !== selectedType) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const titleMatch = mat.title?.toLowerCase().includes(q);
    const topicMatch = mat.topic?.toLowerCase().includes(q);
    const typeMatch = mat.type?.toLowerCase().includes(q);

    let contentMatch = false;
    if (mat.content) {
      if (typeof mat.content === "string") {
        contentMatch = mat.content.toLowerCase().includes(q);
      } else if (typeof mat.content === "object") {
        contentMatch = JSON.stringify(mat.content).toLowerCase().includes(q);
      }
    }

    return titleMatch || topicMatch || typeMatch || contentMatch;
  };

  const filteredAssignments = myAssignments.filter(filterMaterial);
  const filteredPendingAssignments = pendingAssignments.filter(filterMaterial);
  const filteredLibraryMaterials = libraryMaterials.filter(filterMaterial);

  const handleNotifClick = async (notif: any) => {
    if (!notif.read && notif.id) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
  };

  const isFiltering = searchQuery.trim().length > 0 || selectedType !== "all";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Target className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {profile?.name}! 👋
            </h1>
            <p className="text-teal-100 flex flex-wrap items-center gap-2 text-sm sm:text-base">
              <span>{profile?.faculty || "Faculty"}</span> •
              <span>{profile?.department || "Department"}</span> •
              <span>Year {profile?.year || "1"}</span>
            </p>
          </div>
          
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
        <button
          onClick={() => setMainTab("overview")}
          className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
            mainTab === "overview"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Target className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setMainTab("profile")}
          className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
            mainTab === "profile"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <User className="w-4 h-4" /> Profile & Performance
        </button>

        <button
          onClick={() => setMainTab("files")}
          className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
            mainTab === "files"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Folder className="w-4 h-4" /> Course Files
        </button>

      </div>

      
      {mainTab === "files" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FileManager role="student" />
        </div>
      )}

      {mainTab === "profile" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ProfileManager />
        </div>
      )}

      {mainTab === "overview" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Dashboard Search & Material Filter Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search materials, topics, flashcards, quizzes..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1 mr-1 hidden md:block" />
                {[
                  { id: "all", label: "All Items" },
                  { id: "course", label: "Courses" },
                  { id: "quiz", label: "Quizzes" },
                  { id: "flashcards", label: "Flashcards" },
                  { id: "pronunciation", label: "Pronunciation" },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedType === type.id
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Summary & Quick Reset */}
            {isFiltering && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Found{" "}
                    <strong>
                      {filteredAssignments.length + filteredLibraryMaterials.length}
                    </strong>{" "}
                    result(s)
                  </span>
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md font-medium">
                      "{searchQuery}"
                    </span>
                  )}
                  {selectedType !== "all" && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium capitalize">
                      Filter: {selectedType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                  }}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-teal-500" />
                    My Assignments
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("today")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === "today"
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      Today's Tasks
                    </button>
                    <button
                      onClick={() => setActiveTab("upcoming")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === "upcoming"
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      Upcoming
                    </button>
                  </div>
                </div>

                {filteredPendingAssignments.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
                    {isFiltering ? (
                      <>
                        <Search className="w-12 h-12 text-teal-500/60 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                          No matching assignments found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                          Try searching for a different keyword or topic, or clear your filters.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedType("all");
                          }}
                          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                        >
                          Reset Filters
                        </button>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                          You're all caught up!
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                          No pending assignments at the moment. Explore the library to
                          keep learning.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAssignments.map((mat) => {
                      const Icon =
                        IconMap[mat.type as keyof typeof IconMap] || FileText;
                      return (
                        <Link
                          key={mat.id}
                          to={`/dashboard/materials/${mat.id}`}
                          className="block group bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-md"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                  {mat.title}
                                </h3>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
                                  In Progress
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {mat.topic}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {mat.dueDate ? (
                                  <div
                                    className={`flex items-center gap-1.5 ${
                                      mat.dueDate < Date.now()
                                        ? "text-red-500 dark:text-red-400"
                                        : "text-amber-500 dark:text-amber-400"
                                    }`}
                                  >
                                    <Clock className="w-4 h-4" />
                                    {mat.dueDate < Date.now()
                                      ? "Overdue: "
                                      : "Due: "}{" "}
                                    {format(mat.dueDate, "MMM d, h:mm a")}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    No deadline
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  Assigned {format(mat.createdAt, "MMM d, yyyy")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-6 h-6 text-teal-500" />
                    Open Library
                  </h2>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {filteredLibraryMaterials.length} Items
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredLibraryMaterials.map((mat) => {
                    const Icon =
                      IconMap[mat.type as keyof typeof IconMap] || FileText;
                    
  return (
                      <Link
                        key={mat.id}
                        to={`/dashboard/materials/${mat.id}`}
                        className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-md flex flex-col"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            {mat.type}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                          {mat.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 flex-1">
                          {mat.topic}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <span>Added {format(mat.createdAt, "MMM d, yyyy")}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {filteredLibraryMaterials.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      {isFiltering
                        ? "No open library materials match your search filter."
                        : "No open library materials available right now."}
                    </div>
                  )}
                </div>
              </div>
            </div>

        {/* Right Sidebar: Notifications, Calendar, Progress & AI Tutor */}
        <div className="space-y-8">
          {/* Notifications */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-amber-500" />
              Notifications
              {unreadCount > 0 && (
                 <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No recent notifications
                </p>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                                    <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border ${notif.read ? 'bg-slate-50 border-transparent dark:bg-slate-900/30' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 hover:border-blue-200'}`}
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full ${notif.read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'} flex-shrink-0`} />
                    <div className="flex-1">
                      <p className={`text-sm ${notif.read ? 'text-slate-600 dark:text-slate-400 font-medium' : 'font-bold text-slate-900 dark:text-slate-100'}`}>
                        {notif.title}
                      </p>
                      <p className={`text-sm mt-1 ${notif.read ? 'text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notif.message}
                      </p>
                      <p className={`text-xs mt-1.5 ${notif.read ? 'text-slate-400 dark:text-slate-600' : 'text-blue-500 dark:text-blue-400 font-medium'}`}>
                        {format(notif.createdAt, "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
</div>

          {/* Calendar Widget */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-teal-500" />
              Upcoming Deadlines
            </h2>
            <div className="space-y-4">
              {myAssignments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Your calendar is clear!
                </p>
              ) : (
                myAssignments.slice(0, 4).map((mat) => (
                  <div
                    key={mat.id + "-cal"}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-1 rounded text-center min-w-10">
                        <div className="text-xs font-bold uppercase">
                          {format(mat.createdAt + 86400000, "MMM")}
                        </div>
                        <div className="text-lg font-black leading-none">
                          {format(mat.createdAt + 86400000, "dd")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate w-32 md:w-40">
                          {mat.title}
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">
                          Due 11:59 PM
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Progress Widget */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-500" />
              Your Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Weekly Goal
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">
                    3/5 Tasks
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    12
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Completed
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-amber-500">
                    2
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Overdue
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Need Help CTA */}
          <div className="bg-teal-700 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-teal-100 text-sm mb-4">
                Your AI Tutor is available 24/7 to help you with your
                assignments and learning.
              </p>
              <button
                onClick={() => window.dispatchEvent(new Event("open-ai-tutor"))}
                className="w-full py-2 bg-white text-teal-600 font-semibold rounded-lg text-sm hover:bg-teal-50 transition-colors"
              >
                Chat with Tutor
              </button>
            </div>
            <Sparkles className="absolute bottom-0 right-0 w-24 h-24 text-white opacity-10 transform translate-x-1/4 translate-y-1/4" />
          </div>
        </div>
      </div>
    </div>
  )}

  {showAITutor && <AITutor />}
</div>
  );
}
