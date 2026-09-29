import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Calendar,
  TrendingUp,
  BookOpen,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import { useTrainerGroups, type TrainerGroup } from "../../hooks/trainer/useTrainerGroups";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
} from "../../components/ui";
import { api } from "../../lib/api";
import SessionPickerModal from "../../components/trainer/SessionPickerModal";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";

interface GroupStudent {
  _id: string;
  name: string;
  email: string;
  profile?: {
    avatar?: string;
    phone?: string;
  };
  attendance?: {
    percentage: number;
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  enrolledAt: string;
}

interface Session {
  _id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  sessionNumber?: number;
}

export default function TrainerGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { getGroupById } = useTrainerGroups();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [group, setGroup] = useState<TrainerGroup | null>(null);
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [groupSessions, setGroupSessions] = useState<Session[]>([]);

  // Fetch group details and students
  const fetchGroupData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!groupId) {
        throw new Error("Group ID is required");
      }

      // Fetch group details
      const groupData = await getGroupById(groupId);
      setGroup(groupData);

      // Fetch students with detailed info
      const studentsResponse = await api.get(`/trainer/groups/${groupId}/students`);
      setStudents(studentsResponse.data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch group data");
      console.error("Error fetching group data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  // Handle Take Attendance button click
  const handleTakeAttendance = async () => {
    try {
      if (!groupId) return;

      // Fetch sessions for this group
      const response = await api.get(`/trainer/sessions`, {
        params: { groupId, status: 'scheduled,in_progress' }
      });
      const sessions = response.data.data || [];

      // Filter sessions that are scheduled or in_progress
      const availableSessions = sessions.filter(
        (s: Session) => s.status === 'scheduled' || s.status === 'in_progress'
      );

      if (availableSessions.length === 0) {
        // No sessions available - show empty state modal
        setGroupSessions([]);
        setShowSessionPicker(true);
        return;
      }

      // Check if there's a session today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysSessions = availableSessions.filter((s: Session) => {
        const sessionDate = new Date(s.scheduledDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= today && sessionDate < tomorrow;
      });

      if (todaysSessions.length === 1) {
        // Auto-select today's session
        navigate(`/trainer/attendance?session=${todaysSessions[0]._id}`);
      } else if (todaysSessions.length > 1) {
        // Multiple sessions today - show picker with today's sessions
        setGroupSessions(todaysSessions);
        setShowSessionPicker(true);
      } else {
        // No session today - show all available sessions
        setGroupSessions(availableSessions);
        setShowSessionPicker(true);
      }
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      // Show empty modal on error
      setGroupSessions([]);
      setShowSessionPicker(true);
    }
  };

  // Handle session selection from picker
  const handleSelectSession = (sessionId: string) => {
    setShowSessionPicker(false);
    navigate(`/trainer/attendance?session=${sessionId}`);
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardCommon:loading')} />;
  }

  // Show error state
  if (error || !group) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Failed to load group</p>
              <p className="text-sm opacity-90">{error || "Group not found"}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchGroupData}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <Link to="/trainer/groups">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Groups
          </Button>
        </Link>

        <div className={`flex items-start justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {group.thumbnail ? (
              <img
                src={group.thumbnail}
                alt={group.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: group.color + "33" }}
              >
                <Users className="w-10 h-10" style={{ color: group.color }} />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold transition-colors duration-300" style={{ color: '#003300' }}>{group.name}</h1>
              <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{group.courseId?.title}</p>
              <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Badge
                  variant={
                    group.status === "active"
                      ? "success"
                      : group.status === "completed"
                      ? "primary"
                      : "secondary"
                  }
                  size="sm"
                >
                  {group.status}
                </Badge>
                {group.courseId?.category && (
                  <Badge variant="secondary" size="sm">
                    {group.courseId.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {group.boardEnabled && (
              <Link to={`/trainer/groups/${groupId}/board`}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<LayoutDashboard className="w-4 h-4" />}
                >
                  {t('dashboardTrainer:groupBoard')}
                </Button>
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={handleTakeAttendance}
            >
              {t('dashboardTrainer:takeAttendance')}
            </Button>
          </div>
        </div>

        {group.description && (
          <p className={`mt-4 text-white/70 ${isRTL ? 'text-right' : 'text-left'}`}>{group.description}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:totalStudents')}</p>
                <p className="text-3xl font-bold">
                  {group.students.length}/{group.maxStudents}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {group.maxStudents - group.students.length} seats available
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">Avg. Attendance</p>
                <p className="text-3xl font-bold">
                  {Math.round(group.stats?.averageAttendance || 0)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:sessionsCount')}</p>
                <p className="text-3xl font-bold">
                  {group.progress?.completedSessions || 0}/
                  {group.progress?.totalSessions || 0}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {Math.round(group.progress?.percentageComplete || 0)}% complete
                </p>
              </div>
              <Calendar className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>
      </div>

      {/* Schedule Info */}
      {group.schedule && group.schedule.length > 0 && (
        <CardComponent variant="glass">
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.schedule.map((schedule, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{schedule.day}</p>
                    <p className="text-sm text-white/60">
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                    {schedule.location && (
                      <p className="text-xs text-white/40 mt-1">📍 {schedule.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </CardComponent>
      )}

      {/* Students List */}
      <CardComponent variant="glass">
        <CardBody>
          <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-xl font-semibold">Students ({students.length})</h2>
          </div>

          {students.length > 0 ? (
            <div className="space-y-3">
              {students.map((student, index) => (
                <motion.div
                  key={student._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {student.profile?.avatar ? (
                      <img
                        src={student.profile.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{student.name}</h3>
                    <div className={`flex items-center gap-3 text-sm text-white/60 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </span>
                      {student.profile?.phone && (
                        <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          📱 {student.profile.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance Stats */}
                  {student.attendance && (
                    <div className={`hidden md:flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="text-center">
                        <p className="text-xs text-white/40">Attendance</p>
                        <p className="text-lg font-semibold">
                          {Math.round(student.attendance.percentage)}%
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex items-center gap-1 text-green-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <CheckCircle className="w-3 h-3" />
                          {student.attendance.present}
                        </span>
                        <span className={`flex items-center gap-1 text-yellow-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {student.attendance.late}
                        </span>
                        <span className={`flex items-center gap-1 text-red-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <XCircle className="w-3 h-3" />
                          {student.attendance.absent}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/40">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students enrolled yet</p>
              <p className="text-sm mt-2">Students can be added by reception staff</p>
            </div>
          )}
        </CardBody>
      </CardComponent>

      {/* Next Session Info */}
      {group.nextSession && (
        <CardComponent variant="glass">
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Next Session</h2>
            <div className={`flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold">{group.nextSession.title}</h3>
                <div className={`flex items-center gap-4 text-sm text-white/60 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>
                    {formatDate(group.nextSession.scheduledDate)}
                  </span>
                  <span>
                    {group.nextSession.startTime} - {group.nextSession.endTime}
                  </span>
                </div>
              </div>
              <Link to={`/trainer/sessions/${group.nextSession._id}`}>
                <Button variant="primary" size="sm">
                  View Session
                </Button>
              </Link>
            </div>
          </CardBody>
        </CardComponent>
      )}

      {/* Session Picker Modal */}
      <SessionPickerModal
        isOpen={showSessionPicker}
        onClose={() => setShowSessionPicker(false)}
        sessions={groupSessions}
        onSelectSession={handleSelectSession}
        groupName={group.name}
        groupId={groupId}
      />
    </motion.div>
  );
}
