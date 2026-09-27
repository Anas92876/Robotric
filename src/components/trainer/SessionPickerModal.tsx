import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, CheckCircle, Plus } from "lucide-react";
import { Button, Badge, CardComponent, CardBody } from "../ui";
import { Link } from "react-router-dom";

interface Session {
  _id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  sessionNumber?: number;
}

interface SessionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onSelectSession: (sessionId: string) => void;
  groupName?: string;
  groupId?: string;
}

export default function SessionPickerModal({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  groupName,
  groupId,
}: SessionPickerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed bg-black/60 backdrop-blur-sm z-[9999]"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          />

          {/* Modal */}
          <div
            className="fixed flex items-center justify-center z-[10000] p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              overflow: 'auto'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <CardComponent variant="glass">
                <CardBody className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">Select Session</h2>
                      {groupName && (
                        <p className="text-sm text-white/60 mt-1">
                          Choose a session from {groupName} to take attendance
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Sessions List */}
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {sessions.length > 0 ? (
                      sessions.map((session) => (
                        <motion.div
                          key={session._id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onSelectSession(session._id)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {session.sessionNumber && (
                                  <span className="text-xs font-semibold text-white/40">
                                    Session #{session.sessionNumber}
                                  </span>
                                )}
                                <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                                  {session.title}
                                </h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(session.scheduledDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  {session.startTime} - {session.endTime}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={
                                session.status === "completed"
                                  ? "success"
                                  : session.status === "in_progress"
                                  ? "warning"
                                  : "primary"
                              }
                              size="sm"
                            >
                              {session.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16"
                      >
                        {/* Animated Icon */}
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="relative w-24 h-24 mx-auto mb-6"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
                          <div className="relative w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center border border-primary/30">
                            <Calendar className="w-12 h-12 text-primary" />
                          </div>
                        </motion.div>

                        <h3 className="text-xl font-bold text-white mb-3">
                          No Sessions Available
                        </h3>
                        <p className="text-white/60 mb-8 max-w-md mx-auto">
                          {groupName
                            ? `There are no scheduled sessions for ${groupName} yet. Create a session first to take attendance.`
                            : "There are no scheduled sessions yet. Create a session first to take attendance."}
                        </p>

                        <Link
                          to={`/trainer/sessions/new${groupId ? `?groupId=${groupId}` : ''}`}
                          onClick={onClose}
                          className="inline-block"
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-2">
                              <Plus className="w-5 h-5" />
                              Create Session
                            </div>
                          </motion.div>
                        </Link>
                      </motion.div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
