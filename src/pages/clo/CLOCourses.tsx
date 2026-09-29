import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  AlertCircle,
  Users,
  TrendingUp,
  CheckCircle,
  Trash2,
  ArchiveRestore,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  X,
  FolderInput,
  UsersRound,
  User,
  Calendar,
  UserMinus,
  Clock,
  LayoutGrid,
  GraduationCap,
  Layers,
  Filter,
  Home,
  PlayCircle,
  CheckSquare,
  XCircle,
  Pause,
  Award,
  Loader2,
  Download,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";
import { useCLOCourses } from "../../hooks";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";
import { useCLOTrainers } from "../../hooks/clo/useCLOTrainers";
import { useCLOSessions } from "../../hooks/clo/useCLOSessions";
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
} from "../../components/ui";
import CourseModal, { type CourseFormData } from "../../components/clo/CourseModal";
import CourseDetailsModal from "../../components/clo/CourseDetailsModal";
import GroupModal, { type GroupFormData } from "../../components/clo/GroupModal";
import GroupDetailsModal from "../../components/clo/GroupDetailsModal";
import type { Course } from "../../hooks/clo/useCLOCourses";
import type { Group } from "../../hooks/clo/useCLOGroups";
import { useTranslation } from 'react-i18next';
import { formatDate as fmtDate, formatHHMM } from "../../utils/dateTime";

// ─── Folder Types ─────────────────────────────────────────────────────────────
interface CourseFolder {
  id: string;
  name: string;
  courseIds: string[];
  createdAt: number;
}

const FOLDERS_KEY = 'clo_course_folders';

function loadFolders(): CourseFolder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFolders(folders: CourseFolder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

// ─── Shared Breadcrumb ────────────────────────────────────────────────────────
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#003300]/30 flex-shrink-0" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-[#003300]/50 hover:text-[#003300] transition-colors font-medium hover:underline underline-offset-2 truncate max-w-[180px]"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[#003300] font-semibold truncate max-w-[180px]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Status Badge helper ──────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    published:  { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Published' },
    draft:      { color: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Draft' },
    archived:   { color: 'bg-zinc-100 text-zinc-500 border-zinc-200',          label: 'Archived' },
    active:     { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Active' },
    completed:  { color: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'Completed' },
    scheduled:  { color: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Scheduled' },
    in_progress:{ color: 'bg-primary/10 text-primary border-primary/20',       label: 'In Progress' },
    cancelled:  { color: 'bg-red-100 text-red-600 border-red-200',             label: 'Cancelled' },
  };
  const cfg = map[status] ?? { color: 'bg-zinc-100 text-zinc-500 border-zinc-200', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <div className="flex items-center gap-1 text-[#003300]">
        <span className="text-[#003300]/40">{icon}</span>
        <span className="text-base font-bold">{value}</span>
      </div>
      <span className="text-[10px] text-[#003300]/45 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── LEVEL 1: Courses ─────────────────────────────────────────────────────────
function CoursesLevel() {
  const navigate = useNavigate();
  const { courses, isLoading, error, fetchCourses, createCourse, updateCourse, deleteCourse, addSubCourse, removeSubCourse } = useCLOCourses();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Folder state
  const [folders, setFolders]           = useState<CourseFolder[]>(loadFolders);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [moveMenuCourseId, setMoveMenuCourseId] = useState<string | null>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveFolders(folders); }, [folders]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) setMoveMenuCourseId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const p: any = {};
    if (statusFilter !== "all") p.status = statusFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (searchQuery.trim()) p.search = searchQuery;
    fetchCourses(p);
  }, [searchQuery, statusFilter, categoryFilter, fetchCourses]);

  const createFolder = () => {
    const name = newFolderName.trim(); if (!name) return;
    setFolders(prev => [...prev, { id: Date.now().toString(), name, courseIds: [], createdAt: Date.now() }]);
    setNewFolderName(""); setIsCreatingFolder(false);
  };
  const renameFolder = (id: string) => {
    const name = renamingValue.trim(); if (!name) return;
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    setRenamingFolderId(null);
  };
  const deleteFolder = (id: string) => {
    if (!confirm('Delete folder? Courses will not be deleted.')) return;
    setFolders(prev => prev.filter(f => f.id !== id));
    if (openFolderId === id) setOpenFolderId(null);
  };
  const moveCourseToFolder = (cId: string, fId: string | null) => {
    setFolders(prev => prev.map(f => ({ ...f, courseIds: f.courseIds.filter(id => id !== cId) })));
    if (fId) setFolders(prev => prev.map(f => f.id === fId ? { ...f, courseIds: [...f.courseIds.filter(id => id !== cId), cId] } : f));
    setMoveMenuCourseId(null);
  };
  const getFolderForCourse = (cId: string) => folders.find(f => f.courseIds.includes(cId));

  const uncategorized  = courses.filter(c => !folders.some(f => f.courseIds.includes(c._id)));
  const openFolder     = folders.find(f => f.id === openFolderId);
  const folderCourses  = openFolder ? openFolder.courseIds.map(id => courses.find(c => c._id === id)).filter(Boolean) as Course[] : [];
  const displayed      = openFolderId ? folderCourses : uncategorized;
  const categories     = Array.from(new Set(courses.map(c => c.category))).filter(Boolean);

  // Track which bundle cards are expanded
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const toggleBundle = (id: string) => setExpandedBundles(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSubmit = async (data: CourseFormData) => {
    try {
      setIsSubmitting(true);
      if (selectedCourse) { await updateCourse(selectedCourse._id, data as any); alert(t('dashboardCLO:courseUpdatedSuccess')); }
      else                { await createCourse(data as any); alert(t('dashboardCLO:courseCreatedSuccess')); }
      setIsModalOpen(false); setSelectedCourse(null); fetchCourses();
    } catch (e: any) { alert(e.message || t('dashboardCommon:errorMessage')); }
    finally { setIsSubmitting(false); }
  };

  const handleAddSubCourse = async (bundleId: string, courseId: string) => {
    try { await addSubCourse(bundleId, courseId); }
    catch (e: any) { throw e; }
  };

  const handleRemoveSubCourse = async (bundleId: string, courseId: string) => {
    try { await removeSubCourse(bundleId, courseId); }
    catch (e: any) { throw e; }
  };

  const handlePublish   = async (id: string) => { try { await updateCourse(id, { status: "published" } as any); fetchCourses(); } catch (e: any) { alert(e.message); } };
  const handleArchive   = async (id: string) => { try { await updateCourse(id, { status: "archived" } as any);  fetchCourses(); } catch (e: any) { alert(e.message); } };
  const handleUnarchive = async (id: string) => { try { await updateCourse(id, { status: "draft" } as any);     fetchCourses(); } catch (e: any) { alert(e.message); } };
  const handleDelete    = async (id: string) => {
    if (!confirm(t('dashboardCLO:deleteCourseConfirm'))) return;
    try { await deleteCourse(id); } catch (e: any) { alert(e.message); }
  };

  if (isLoading && courses.length === 0) return <LoadingState type="skeleton" text={t('dashboardCLO:loadingCourses')} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-[#003300]">
              {openFolder ? openFolder.name : t('dashboardCLO:courses')}
            </h1>
            {openFolder && (
              <button onClick={() => setOpenFolderId(null)} className="ml-1 text-xs text-[#003300]/40 hover:text-[#003300] underline underline-offset-2 transition-colors">
                ← all folders
              </button>
            )}
          </div>
          <p className="text-sm text-[#003300]/50">
            {openFolder
              ? `${folderCourses.length} course${folderCourses.length !== 1 ? 's' : ''} in this folder`
              : `${courses.length} total course${courses.length !== 1 ? 's' : ''} · ${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!openFolderId && (
            <Button variant="ghost" size="sm" leftIcon={<FolderPlus className="w-4 h-4" />} onClick={() => setIsCreatingFolder(true)}>
              New Folder
            </Button>
          )}
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedCourse(null); setIsModalOpen(true); }}>
            {t('dashboardCLO:addCourse')}
          </Button>
        </div>
      </div>

      {/* ── New Folder Input ── */}
      <AnimatePresence>
        {isCreatingFolder && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <input
                autoFocus type="text" value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(""); } }}
                placeholder="Folder name…"
                className="flex-1 bg-transparent outline-none text-[#003300] text-sm placeholder-amber-400"
              />
              <button onClick={createFolder} className="text-xs font-semibold text-amber-700 hover:text-amber-800 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors">Create</button>
              <button onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }} className="text-amber-400 hover:text-amber-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Folders Row ── */}
      {!openFolderId && folders.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#003300]/40 uppercase tracking-wider mb-3">Folders</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map(folder => (
              <motion.div key={folder.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group relative">
                {renamingFolderId === folder.id ? (
                  <div className="bg-white rounded-xl p-3 border-2 border-primary/40 flex flex-col items-center gap-2 shadow-md">
                    <FolderOpen className="w-8 h-8 text-amber-400" />
                    <input autoFocus type="text" value={renamingValue}
                      onChange={e => setRenamingValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setRenamingFolderId(null); }}
                      onBlur={() => renameFolder(folder.id)}
                      className="w-full text-center text-xs outline-none border-b border-primary text-[#003300] bg-transparent"
                    />
                  </div>
                ) : (
                  <button onClick={() => setOpenFolderId(folder.id)}
                    className="w-full bg-white rounded-xl p-3 border border-[#003300]/10 hover:border-amber-300 hover:shadow-md hover:bg-amber-50/50 transition-all duration-200 flex flex-col items-center gap-2 text-center group/btn"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center group-hover/btn:bg-amber-100 transition-colors">
                        <Folder className="w-6 h-6 text-amber-500" />
                      </div>
                      {folder.courseIds.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                          {folder.courseIds.filter(id => courses.find(c => c._id === id)).length}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#003300] line-clamp-2 leading-snug">{folder.name}</span>
                  </button>
                )}
                {/* Folder actions */}
                <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center gap-0.5 bg-white rounded-lg shadow border border-[#003300]/10 p-0.5 z-10">
                  <button onClick={e => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenamingValue(folder.name); }} className="p-1 hover:bg-[#003300]/5 rounded text-[#003300]/40 hover:text-[#003300] transition-colors" title="Rename"><Edit className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }} className="p-1 hover:bg-red-50 rounded text-[#003300]/40 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </motion.div>
            ))}
          </div>
          {uncategorized.length > 0 && <p className="text-xs font-semibold text-[#003300]/40 uppercase tracking-wider mt-6 mb-3">Uncategorized Courses</p>}
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-xl border border-[#003300]/10 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/35" />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#003300]/3 rounded-lg border border-transparent focus:border-[#003300]/20 focus:bg-white outline-none text-[#003300] placeholder-[#003300]/35 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg border border-[#003300]/15 bg-white text-[#003300] focus:border-[#003300]/30 outline-none">
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg border border-[#003300]/15 bg-white text-[#003300] focus:border-[#003300]/30 outline-none">
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => fetchCourses()}>Retry</Button>
          </div>
        </Alert>
      )}

      {/* ── Courses Grid ── */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((course, i) => (
            <motion.div key={course._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}>
              <div className={`group relative bg-white rounded-2xl border hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full ${
                course.type === 'bundle'
                  ? 'border-violet-200 hover:border-violet-300'
                  : 'border-[#003300]/10 hover:border-[#003300]/25'
              }`}>
                {/* Top accent bar */}
                <div className={`h-1.5 w-full ${
 course.type ==='bundle'
 ?'bg-violet-400'
 : course.status ==='published'?'bg-emerald-400': course.status ==='draft'?'bg-amber-400':'bg-zinc-300'
 }`} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Top row: icon + status + actions */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
 course.type ==='bundle'
 ?'bg-violet-400'
 :'bg-primary'
 }`}>
                      {course.type === 'bundle'
                        ? <Layers className="w-5 h-5 text-white" />
                        : <BookOpen className="w-5 h-5 text-white" />
                      }
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {course.type === 'bundle' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                          <Layers className="w-3 h-3" /> Bundle
                        </span>
                      )}
                      <StatusPill status={course.status} />
                      {/* Folder move */}
                      {folders.length > 0 && (
                        <div className="relative">
                          <button onClick={() => setMoveMenuCourseId(prev => prev === course._id ? null : course._id)} className="p-1.5 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="Move to folder">
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
                          {moveMenuCourseId === course._id && (
                            <div ref={moveMenuRef} className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-[#003300]/10 py-1.5 min-w-[170px]">
                              <p className="px-3 py-1 text-[10px] font-bold text-[#003300]/35 uppercase tracking-wider">Move to folder</p>
                              {getFolderForCourse(course._id) && (
                                <button onClick={() => moveCourseToFolder(course._id, null)} className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50 flex items-center gap-2 transition-colors">
                                  <X className="w-3 h-3" /> Remove from folder
                                </button>
                              )}
                              {folders.map(f => (
                                <button key={f.id} onClick={() => moveCourseToFolder(course._id, f.id)} className={`w-full text-left px-3 py-2 text-xs hover:bg-[#003300]/3 flex items-center gap-2 transition-colors ${f.courseIds.includes(course._id) ? 'text-primary font-semibold' : 'text-[#003300]'}`}>
                                  <Folder className="w-3 h-3 text-amber-400" />{f.name}
                                  {f.courseIds.includes(course._id) && <CheckCircle className="w-3 h-3 ml-auto text-primary" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={() => { setSelectedCourseId(course._id); setIsDetailsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="View details"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedCourse(course as any); setIsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      {course.status === "draft" && <button onClick={() => handlePublish(course._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#003300]/40 hover:text-emerald-600 transition-colors" title="Publish"><CheckCircle className="w-3.5 h-3.5" /></button>}
                      {course.status === "published" && <button onClick={() => handleArchive(course._id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-[#003300]/40 hover:text-amber-600 transition-colors" title="Archive"><Archive className="w-3.5 h-3.5" /></button>}
                      {course.status === "archived" && <button onClick={() => handleUnarchive(course._id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#003300]/40 hover:text-blue-600 transition-colors" title="Restore to draft"><ArchiveRestore className="w-3.5 h-3.5" /></button>}
                      {course.status === "draft" && <button onClick={() => handleDelete(course._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#003300]/40 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>

                  {/* Title */}
                  <button onClick={() => course.type !== 'bundle' && navigate(`/clo/courses/${course._id}`)} className={`text-left mb-1 group/t ${course.type === 'bundle' ? 'cursor-default' : ''}`}>
                    <h3 className="text-base font-bold text-[#003300] group-hover/t:text-primary transition-colors line-clamp-2 leading-snug">{course.title}</h3>
                  </button>

                  {/* Category + level chips */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {course.category && <span className="bg-primary/8 text-primary text-[11px] font-medium px-2 py-0.5 rounded-md">{course.category}</span>}
                    {course.level && <span className="text-[11px] text-[#003300]/45 capitalize">{course.level}</span>}
                    {course.wroDocumentsRequired && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-700">
                        <Award className="w-3 h-3" /> WRO
                      </span>
                    )}
                  </div>

                  {/* Bundle pricing summary */}
                  {course.type === 'bundle' && course.bundlePrice != null && (
                    <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-violet-50 rounded-xl">
                      <div className="flex-1">
                        <p className="text-[11px] text-violet-500 font-medium">Bundle price</p>
                        <p className="text-lg font-bold text-violet-700">${course.bundlePrice}</p>
                      </div>
                      {course.stats?.discountPct && course.stats.discountPct > 0 ? (
                        <div className="text-right">
                          <p className="text-[11px] text-violet-400 line-through">${course.stats.individualTotal}</p>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Save {course.stats.discountPct}%
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-[#003300]/50 line-clamp-2 mb-4 flex-grow leading-relaxed">
                    {course.description || 'No description provided.'}
                  </p>

                  {/* Stats row */}
                  {course.stats && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#003300]/6">
                      {course.type === 'bundle' ? (
                        <>
                          <StatChip icon={<Layers className="w-3.5 h-3.5" />} value={course.stats.subCourseCount || course.bundleCourses?.length || 0} label="Courses" />
                          <div className="w-px h-6 bg-[#003300]/8" />
                          <StatChip icon={<GraduationCap className="w-3.5 h-3.5" />} value={course.stats.totalEnrollments || 0} label="Students" />
                          <div className="w-px h-6 bg-[#003300]/8" />
                          <StatChip icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${course.stats.completionRate?.toFixed(0) || 0}%`} label="Complete" />
                        </>
                      ) : (
                        <>
                          <StatChip icon={<UsersRound className="w-3.5 h-3.5" />} value={course.stats.totalGroups || 0} label="Groups" />
                          <div className="w-px h-6 bg-[#003300]/8" />
                          <StatChip icon={<GraduationCap className="w-3.5 h-3.5" />} value={course.stats.totalEnrollments || 0} label="Students" />
                          <div className="w-px h-6 bg-[#003300]/8" />
                          <StatChip icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${course.stats.completionRate?.toFixed(0) || 0}%`} label="Complete" />
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Bundle: expandable sub-courses panel */}
                {course.type === 'bundle' && (course.bundleCourses?.length ?? 0) > 0 && (
                  <>
                    <button
                      onClick={() => toggleBundle(course._id)}
                      className="flex items-center justify-between px-5 py-2.5 bg-violet-50/60 hover:bg-violet-100/60 border-t border-violet-100 transition-colors"
                    >
                      <span className="text-xs font-semibold text-violet-600">
                        {expandedBundles.has(course._id) ? 'Hide' : 'Show'} sub-courses ({course.bundleCourses?.length || 0})
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedBundles.has(course._id) ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedBundles.has(course._id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-violet-100"
                        >
                          <div className="divide-y divide-violet-50">
                            {course.bundleCourses?.map(sc => (
                              <div key={sc._id} className="flex items-center gap-3 px-5 py-2.5 bg-violet-50/30 hover:bg-violet-50/60 transition-colors">
                                <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="w-3 h-3 text-violet-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-[#003300] truncate">{sc.title}</p>
                                  <p className="text-[10px] text-[#003300]/40">${sc.price?.toFixed(0) || '0'} individually</p>
                                </div>
                                <button
                                  onClick={() => navigate(`/clo/courses/${sc._id}`)}
                                  className="text-[10px] text-violet-500 hover:text-violet-700 font-medium flex-shrink-0"
                                >
                                  Groups →
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* Footer CTA — only for single courses */}
                {course.type !== 'bundle' && (
                  <button
                    onClick={() => navigate(`/clo/courses/${course._id}`)}
                    className="flex items-center justify-between px-5 py-3 bg-[#003300]/3 hover:bg-[#003300]/7 border-t border-[#003300]/6 transition-colors group/cta"
                  >
                    <span className="text-xs font-semibold text-[#003300]/60 group-hover/cta:text-[#003300] transition-colors">View Groups & Sessions</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#003300]/40 group-hover/cta:text-[#003300] group-hover/cta:translate-x-0.5 transition-all" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#003300]/10 py-20 text-center">
          {openFolderId ? <FolderOpen className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" /> : <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" />}
          <p className="font-semibold text-[#003300]/60 mb-1">{openFolderId ? 'Folder is empty' : 'No courses found'}</p>
          <p className="text-sm text-[#003300]/35 mb-5">
            {openFolderId ? 'Move courses into this folder using the folder icon on each course card.' : searchQuery || statusFilter !== "all" ? 'Try adjusting your filters.' : 'Get started by adding your first course.'}
          </p>
          {!openFolderId && !searchQuery && statusFilter === "all" && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedCourse(null); setIsModalOpen(true); }}>
              {t('dashboardCLO:addCourse')}
            </Button>
          )}
        </div>
      )}

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedCourse(null); }}
        onSubmit={handleSubmit}
        course={selectedCourse as any}
        isLoading={isSubmitting}
        onAddSubCourse={handleAddSubCourse}
        onRemoveSubCourse={handleRemoveSubCourse}
      />
      <CourseDetailsModal isOpen={isDetailsModalOpen} onClose={() => { setIsDetailsModalOpen(false); setSelectedCourseId(null); }} courseId={selectedCourseId} />
    </motion.div>
  );
}

// ─── LEVEL 2: Groups for a Course ────────────────────────────────────────────
function GroupsLevel({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const { groups, isLoading, error, fetchGroups, createGroup, updateGroup, deleteGroup, closeGroup, toggleGroupBoard } = useCLOGroups();
  const { courses, fetchCourses } = useCLOCourses();
  const { trainers, fetchTrainers } = useCLOTrainers();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const currentCourse = courses.find(c => c._id === courseId);

  useEffect(() => { fetchCourses({}); fetchTrainers(); }, [fetchCourses, fetchTrainers]);
  useEffect(() => {
    const p: any = { courseId };
    if (statusFilter !== "all") p.status = statusFilter;
    if (searchQuery.trim()) p.search = searchQuery;
    fetchGroups(p);
  }, [searchQuery, statusFilter, courseId, fetchGroups]);

  const handleSubmit = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      if (selectedGroup) { await updateGroup(selectedGroup._id, data); alert("Group updated!"); }
      else { await createGroup({ ...data, courseId }); alert("Group created!"); }
      setIsModalOpen(false); setSelectedGroup(null); fetchGroups({ courseId });
    } catch (e: any) { alert(e.message || "An error occurred"); }
    finally { setIsSubmitting(false); }
  };
  const handleCloseGroup = async (id: string, status: string) => {
    try {
      await closeGroup(id, status === "completed" ? "reopen" : "close");
      fetchGroups({ courseId });
    } catch (e: any) { alert(e.message); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm(t('dashboardCLO:deleteGroupConfirm'))) return;
    try { await deleteGroup(id); fetchGroups({ courseId }); } catch (e: any) { alert(e.message); }
  };
  const handleToggleBoard = async (id: string) => {
    try { await toggleGroupBoard(id); } catch (e: any) { alert(e.message || 'Failed to toggle board'); }
  };

  if (isLoading && groups.length === 0) return <LoadingState type="skeleton" text={t('dashboardCLO:loadingGroups')} />;

  const activeCount    = groups.filter(g => g.status === 'active').length;
  const completedCount = groups.filter(g => g.status === 'completed').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">

      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: t('dashboardCLO:courses'), onClick: () => navigate('/clo/courses') },
        { label: currentCourse?.title || '…' },
      ]} />

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UsersRound className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-[#003300]">Groups</h1>
          </div>
          {currentCourse && (
            <p className="text-sm text-[#003300]/50">
              {currentCourse.title} · <span className="text-emerald-600 font-medium">{activeCount} active</span>
              {completedCount > 0 && <span className="text-zinc-400"> · {completedCount} completed</span>}
            </p>
          )}
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedGroup(null); setIsModalOpen(true); }}>
          {t('dashboardCLO:createGroup')}
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-[#003300]/10 p-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/35" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search groups…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#003300]/3 rounded-lg border border-transparent focus:border-[#003300]/20 focus:bg-white outline-none text-[#003300] placeholder-[#003300]/35 transition-all"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-[#003300]/15 bg-white text-[#003300] outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => fetchGroups({ courseId })}>Retry</Button>
          </div>
        </Alert>
      )}

      {/* ── Groups List ── */}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <motion.div key={group._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
              <div className="group bg-white rounded-2xl border border-[#003300]/10 hover:border-[#003300]/22 hover:shadow-lg transition-all duration-300 overflow-hidden">
                {/* Left accent */}
                <div className="flex">
                  <div className={`w-1 flex-shrink-0 ${group.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: avatar + info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/80 flex items-center justify-center text-white flex-shrink-0">
                          <UsersRound className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Name row */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <button
                              onClick={() => navigate(`/clo/courses/${courseId}/${group._id}`)}
                              className="text-base font-bold text-[#003300] hover:text-primary transition-colors flex items-center gap-1 group/name"
                            >
                              {group.name}
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-100 group-hover/name:translate-x-0.5 transition-all" />
                            </button>
                            <StatusPill status={group.status} />
                          </div>
                          {/* Meta row */}
                          <div className="flex items-center gap-4 text-xs text-[#003300]/50 flex-wrap">
                            {group.trainerId?.name && (
                              <span className="flex items-center gap-1"><User className="w-3 h-3" />{group.trainerId.name}</span>
                            )}
                            {group.startDate && (
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(group.startDate)}</span>
                            )}
                            {group.stats && (
                              <span className="flex items-center gap-1 font-medium text-[#003300]/60">
                                <Users className="w-3 h-3" />
                                {group.stats.studentsCount || 0}
                                {(group.maxStudents || group.maxCapacity) && `/${group.maxStudents || group.maxCapacity}`} students
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setSelectedGroupId(group._id); setIsDetailsModalOpen(true); }} className="p-2 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="View details"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { setSelectedGroup(group); setIsModalOpen(true); }} className="p-2 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button
                          onClick={() => handleCloseGroup(group._id, group.status)}
                          className={`p-2 rounded-lg transition-colors ${group.status === 'completed' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-[#003300]/40 hover:text-amber-600 hover:bg-amber-50'}`}
                          title={group.status === 'completed' ? 'Reopen group' : 'Close group'}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleBoard(group._id)}
                          className={`p-2 rounded-lg transition-colors ${group.boardEnabled ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-[#003300]/40 hover:text-primary hover:bg-primary/8'}`}
                          title={group.boardEnabled ? t('dashboardCLO:boardEnabledTooltip') : t('dashboardCLO:boardDisabledTooltip')}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(group._id)} className="p-2 rounded-lg hover:bg-red-50 text-[#003300]/40 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* "View Sessions" footer link */}
                    <div className="mt-3 pt-3 border-t border-[#003300]/6 flex justify-end">
                      <button
                        onClick={() => navigate(`/clo/courses/${courseId}/${group._id}`)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#003300]/40 hover:text-primary transition-colors group/s"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        View Sessions
                        <ChevronRight className="w-3 h-3 group-hover/s:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#003300]/10 py-20 text-center">
          <UsersRound className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" />
          <p className="font-semibold text-[#003300]/60 mb-1">No groups found</p>
          <p className="text-sm text-[#003300]/35 mb-5">
            {searchQuery || statusFilter !== "all" ? 'Try adjusting your filters.' : 'Create the first group for this course.'}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedGroup(null); setIsModalOpen(true); }}>
              {t('dashboardCLO:createGroup')}
            </Button>
          )}
        </div>
      )}

      <GroupModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedGroup(null); }} onSubmit={handleSubmit} group={selectedGroup} courses={courses} trainers={trainers} isLoading={isSubmitting} />
      <GroupDetailsModal isOpen={isDetailsModalOpen} onClose={() => { setIsDetailsModalOpen(false); setSelectedGroupId(null); }} groupId={selectedGroupId} />
    </motion.div>
  );
}

// ─── LEVEL 3: Sessions for a Group ───────────────────────────────────────────
function SessionsLevel({ courseId, groupId }: { courseId: string; groupId: string }) {
  const navigate = useNavigate();
  const { sessions, isLoading, error, refetch, deleteSession } = useCLOSessions({ groupId });
  const { courses, fetchCourses } = useCLOCourses();
  const { groups, fetchGroups } = useCLOGroups();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO', 'dashboardTrainer']);

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  // Certificate generation / deletion
  const [certGenerating, setCertGenerating] = useState(false);
  const [certDeleting, setCertDeleting] = useState(false);
  const [certResult, setCertResult] = useState<{
    issued: number;
    skipped: number;
    noEnglishName: number;
    certificates: { studentName: string; certificateNumber: string; skipped?: boolean; skippedReason?: string }[];
    warning?: string | null;
  } | null>(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'generate' | 'delete';
    open: boolean;
    input: string;
  }>({ type: 'generate', open: false, input: '' });

  const groupName = groups.find(g => g._id === groupId)?.name || 'this group';

  const handleGenerateCertificates = async () => {
    setConfirmModal({ type: 'generate', open: true, input: '' });
  };

  const handleDeleteCertificates = () => {
    setConfirmModal({ type: 'delete', open: true, input: '' });
  };

  const handleConfirm = async () => {
    const { type } = confirmModal;

    // For delete, require typing "DELETE"
    if (type === 'delete' && confirmModal.input !== 'DELETE') return;

    setConfirmModal(m => ({ ...m, open: false, input: '' }));
    setCertError(null);

    try {
      const { api } = await import('../../lib/api');

      if (type === 'generate') {
        setCertGenerating(true);
        setCertResult(null);
        const res = await api.post(`/clo/certificates/generate-group/${groupId}`);
        const certs = res.data.certificates || [];
        const noEnglishName = certs.filter((c: any) => c.skipped && c.skippedReason?.includes('English')).length;
        setCertResult({
          issued: res.data.issued,
          skipped: res.data.skipped,
          noEnglishName,
          certificates: certs,
          warning: res.data.warning || null,
        });
      } else {
        setCertDeleting(true);
        setCertResult(null);
        const res = await api.delete(`/clo/certificates/group/${groupId}`);
        setCertResult({ issued: -(res.data.deleted ?? 0), skipped: 0, noEnglishName: 0, certificates: [] });
      }
    } catch (err: any) {
      setCertError(err.response?.data?.error?.message || err.message || 'Operation failed');
    } finally {
      setCertGenerating(false);
      setCertDeleting(false);
    }
  };

  const downloadAllCertificates = async () => {
    if (!certResult || certDownloading) return;
    const toDownload = certResult.certificates.filter(c => !c.skipped && c.certificateNumber);
    if (toDownload.length === 0) return;
    setCertDownloading(true);
    try {
      const { api } = await import('../../lib/api');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const { CertificateA4 } = await import('../../components/certificate/CertificateRenderer');
      const { createRoot } = await import('react-dom/client');
      const React = await import('react');

      for (const c of toDownload) {
        // Fetch full cert data from student endpoint using cert number
        const res = await api.get(`/student/certificates`).catch(() => null);
        // We already have certificateNumber and studentName in certResult
        // Build minimal cert data — trainingHours from courseDoc
        const certData = {
          certificateNumber: c.certificateNumber,
          studentName: c.studentName,
          courseName: currentCourse?.title || '',
          courseLevel: currentCourse?.level || '',
          trainingHours: currentCourse?.totalHours || 0,
          issuedAt: new Date().toISOString(),
        };

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1123px;height:794px;';
        document.body.appendChild(container);
        const root = createRoot(container);

        await new Promise<void>(resolve => {
          root.render(React.createElement(CertificateA4, { cert: certData }));
          setTimeout(resolve, 500);
        });

        const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
          scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
        pdf.save(`Certificate-${c.studentName.replace(/\s+/g, '-')}.pdf`);

        root.unmount();
        document.body.removeChild(container);
      }
    } finally {
      setCertDownloading(false);
    }
  };

  const currentCourse = courses.find(c => c._id === courseId);
  const currentGroup  = groups.find(g => g._id === groupId);

  useEffect(() => { fetchCourses({}); fetchGroups({ courseId }); }, [fetchCourses, fetchGroups, courseId]);

  const filtered = useMemo(() => sessions.filter(s => {
    if (selectedStatus && s.status !== selectedStatus) return false;
    if (search) { const q = search.toLowerCase(); return s.title.toLowerCase().includes(q) || (s.description?.toLowerCase().includes(q) ?? false); }
    return true;
  }), [sessions, selectedStatus, search]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session permanently?')) return;
    await deleteSession(sessionId, true);
  };

  const formatDate = (d: string) => fmtDate(d);
  const formatTime = (t: string) => formatHHMM(t);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':   return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-primary" />;
      case 'scheduled':   return <Clock className="w-4 h-4 text-amber-500" />;
      case 'cancelled':   return <XCircle className="w-4 h-4 text-red-400" />;
      default:            return <Pause className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Stats
  const scheduledCount   = sessions.filter(s => s.status === 'scheduled').length;
  const completedCount   = sessions.filter(s => s.status === 'completed').length;
  const inProgressCount  = sessions.filter(s => s.status === 'in_progress').length;

  if (isLoading) return <LoadingState type="skeleton" text="Loading sessions…" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">

      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: t('dashboardCLO:courses'),         onClick: () => navigate('/clo/courses') },
        { label: currentCourse?.title || '…',       onClick: () => navigate(`/clo/courses/${courseId}`) },
        { label: currentGroup?.name || '…' },
      ]} />

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-[#003300]">Sessions</h1>
          </div>
          {currentGroup && (
            <p className="text-sm text-[#003300]/50">
              {currentGroup.name} ·{' '}
              <span className="text-amber-600 font-medium">{scheduledCount} scheduled</span>
              {inProgressCount > 0 && <span className="text-primary font-medium"> · {inProgressCount} in progress</span>}
              {completedCount > 0 && <span className="text-emerald-600 font-medium"> · {completedCount} done</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={certDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            onClick={handleDeleteCertificates}
            disabled={certGenerating || certDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
          >
            {certDeleting ? 'Deleting…' : 'Delete Certificates'}
          </Button>
          <Button
            variant="ghost"
            leftIcon={certGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            onClick={handleGenerateCertificates}
            disabled={certGenerating || certDeleting}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200"
          >
            {certGenerating ? 'Generating…' : 'Generate Certificates'}
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate(`/clo/sessions/new?groupId=${groupId}&courseId=${courseId}`)}>
            {t('dashboardTrainer:createSession')}
          </Button>
        </div>
      </div>

      {/* ── Certificate result banner ── */}
      {certResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            certResult.issued < 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {certResult.issued < 0
              ? <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              : <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${certResult.issued < 0 ? 'text-red-800' : 'text-amber-800'}`}>
                {certResult.issued < 0 ? 'Certificates deleted' : 'Certificates generated successfully'}
              </p>
              <p className={`text-xs mt-0.5 ${certResult.issued < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {certResult.issued < 0
                  ? `${Math.abs(certResult.issued)} certificate(s) permanently removed`
                  : `${certResult.issued} new ${certResult.issued === 1 ? 'certificate' : 'certificates'} issued${certResult.skipped > 0 ? ` · ${certResult.skipped} already existed` : ''}`
                }
              </p>
              {certResult.noEnglishName > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    <strong>{certResult.noEnglishName}</strong> student{certResult.noEnglishName > 1 ? 's' : ''} skipped — no English name found in Lead records
                  </span>
                </div>
              )}
              {certResult.warning && (
                <div className="flex items-start gap-1.5 mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{certResult.warning}</span>
                </div>
              )}
              {certResult.issued > 0 && (
                <button
                  onClick={downloadAllCertificates}
                  disabled={certDownloading}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {certDownloading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading…</>
                    : <><Download className="w-3.5 h-3.5" /> Download All ({certResult.issued}) PDFs</>
                  }
                </button>
              )}
            </div>
            <button onClick={() => setCertResult(null)} className={certResult.issued < 0 ? 'text-red-400 hover:text-red-600' : 'text-amber-500 hover:text-amber-700'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Certificate error banner ── */}
      {certError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="flex-1 text-sm text-red-700">{certError}</p>
          <button onClick={() => setCertError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── Confirmation modal ── */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setConfirmModal(m => ({ ...m, open: false, input: '' }))}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              {confirmModal.type === 'delete' ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Delete All Certificates</h3>
                      <p className="text-xs text-gray-500">This cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    This will permanently delete <strong>all certificates</strong> issued for{' '}
                    <strong>{groupName}</strong>. Students will lose access to their certificates immediately.
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Type <span className="font-mono text-red-600 bg-red-50 px-1 rounded">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={confirmModal.input}
                    onChange={e => setConfirmModal(m => ({ ...m, input: e.target.value }))}
                    placeholder="Type DELETE"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setConfirmModal(m => ({ ...m, open: false, input: '' }))}>
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleConfirm}
                      disabled={confirmModal.input !== 'DELETE'}
                      className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Delete All Certificates
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Generate Certificates</h3>
                      <p className="text-xs text-gray-500">Issue date will be today</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Generate certificates for all students in <strong>{groupName}</strong>.
                    Only students with an English name in Lead records will receive a certificate.
                    Students who already have a certificate will be skipped automatically.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setConfirmModal(m => ({ ...m, open: false, input: '' }))}>
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleConfirm}
                      className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Generate Certificates
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini Stats Cards ── */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: sessions.length, color: 'bg-[#003300]/5 text-[#003300]' },
            { label: 'Scheduled', value: scheduledCount, color: 'bg-amber-50 text-amber-700' },
            { label: 'In Progress', value: inProgressCount, color: 'bg-primary/8 text-primary' },
            { label: 'Completed', value: completedCount, color: 'bg-emerald-50 text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => refetch({ groupId })}>Retry</Button>
          </div>
        </Alert>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-[#003300]/10 p-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/35" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#003300]/3 rounded-lg border border-transparent focus:border-[#003300]/20 focus:bg-white outline-none text-[#003300] placeholder-[#003300]/35 transition-all"
            />
          </div>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-[#003300]/15 bg-white text-[#003300] outline-none">
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {(selectedStatus || search) && (
            <button onClick={() => { setSelectedStatus(""); setSearch(""); }} className="px-3 py-2 text-sm rounded-lg border border-[#003300]/15 bg-white text-[#003300]/50 hover:text-[#003300] flex items-center gap-1.5 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Sessions ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#003300]/10 py-20 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" />
          <p className="font-semibold text-[#003300]/60 mb-1">No sessions found</p>
          <p className="text-sm text-[#003300]/35 mb-5">
            {selectedStatus || search ? 'Try clearing your filters.' : 'Schedule the first session for this group.'}
          </p>
          {!selectedStatus && !search && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate(`/clo/sessions/new?groupId=${groupId}&courseId=${courseId}`)}>
              {t('dashboardTrainer:createSession')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session, i) => (
            <motion.div key={session._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.03 }}>
              <div
                className="group bg-white rounded-xl border border-[#003300]/10 hover:border-[#003300]/22 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/clo/sessions/${session._id}`)}
              >
                <div className="flex items-center gap-0">
                  {/* Status stripe */}
                  <div className={`w-1 self-stretch flex-shrink-0 ${
                    session.status === 'completed' ? 'bg-emerald-400' :
                    session.status === 'in_progress' ? 'bg-primary' :
                    session.status === 'scheduled' ? 'bg-amber-400' : 'bg-red-300'
                  }`} />

                  <div className="flex-1 flex items-center gap-4 px-5 py-4">
                    {/* Status icon */}
                    <div className="flex-shrink-0">{getStatusIcon(session.status)}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#003300] text-sm truncate">{session.title}</h3>
                        <StatusPill status={session.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-[#003300]/50 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(session.scheduledDate)}</span>
                        {session.startTime && session.endTime && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(session.startTime)} – {formatTime(session.endTime)}</span>
                        )}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.groupId?.students?.length || 0} students</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/clo/sessions/${session._id}/edit`); }}
                        className="p-1.5 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDelete(session._id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#003300]/40 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function CLOCourses() {
  const { courseId, groupId } = useParams<{ courseId?: string; groupId?: string }>();
  if (courseId && groupId) return <SessionsLevel courseId={courseId} groupId={groupId} />;
  if (courseId) return <GroupsLevel courseId={courseId} />;
  return <CoursesLevel />;
}
