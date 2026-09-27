/**
 * EventDetailsModal Component
 *
 * Modal for viewing event details with edit and delete options
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Badge } from '../ui';
import { Calendar, Clock, User, Edit2, Trash2, Users, CreditCard, FileText } from 'lucide-react';
import dayjs from 'dayjs';

interface Participant {
  _id?: string;
  type: 'lead' | 'custom' | 'company';
  leadId?: any;
  customName?: string;
  customPhone?: string;
  companyRole?: string;
}

interface Event {
  _id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  participants?: Participant[];
  createdBy?: any;
  type?: 'event' | 'subscription_session';
  sessionRequest?: any; // SessionRequest type
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!event) return null;

  // Handle subscription session differently
  const isSubscriptionSession = event.type === 'subscription_session';

  const formatDate = (date: Date) => {
    return dayjs(date).format('MMMM DD, YYYY');
  };

  const formatTime = (date: Date) => {
    return dayjs(date).format('h:mm A');
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      gray: 'bg-zinc-500',
    };
    return colorMap[color || 'blue'];
  };

  const getParticipantDisplay = (p: Participant) => {
    if (p.type === 'company') {
      return { name: p.companyRole || 'Unknown', subtitle: 'Company Internal' };
    }
    if (p.type === 'lead' && p.leadId) {
      return {
        name: p.leadId.fullName || 'Unknown',
        subtitle: p.leadId.mobileNumber || 'External Lead'
      };
    }
    return {
      name: p.customName || 'Unknown',
      subtitle: p.customPhone || 'Custom Participant'
    };
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsDeleting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Handle subscription session display
  if (isSubscriptionSession && event.sessionRequest) {
    const session = event.sessionRequest;
    const user = typeof session.userId === 'object' ? session.userId : null;
    const endTime = new Date(
      new Date(`${session.date.split('T')[0]}T${session.startTime}`).getTime() +
        session.durationHours * 60 * 60 * 1000
    );

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Subscription Session Details"
        size="md"
      >
        <div className="space-y-6">
          {/* Session Header */}
          <div className="flex items-start gap-4">
            <div className={`w-4 h-4 rounded-full ${getColorClass('purple')} mt-1 flex-shrink-0`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold transition-colors duration-300" style={{ color: '#003300' }}>{event.title}</h2>
                <Badge variant="success">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Subscription Session
                </Badge>
              </div>
              {session.description && (
                <p className="mt-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{session.description}</p>
              )}
            </div>
          </div>

          {/* Student Info */}
          {user && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-purple-900">{user.name}</p>
                  <p className="text-sm text-purple-600">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-3 rounded-lg p-4 border transition-colors duration-300" style={{ backgroundColor: '#003300' + '08', borderColor: '#003300' + '20' }}>
            <div className="flex items-center gap-3 transition-colors duration-300" style={{ color: '#003300' }}>
              <Calendar className="w-5 h-5" style={{ color: '#003300' + 'CC' }} />
              <div>
                <p className="text-sm font-medium transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>Date</p>
                <p className="font-medium transition-colors duration-300" style={{ color: '#003300' }}>{formatDate(new Date(session.date))}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 transition-colors duration-300" style={{ color: '#003300' }}>
              <Clock className="w-5 h-5" style={{ color: '#003300' + 'CC' }} />
              <div>
                <p className="text-sm font-medium transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>Time</p>
                <p className="font-medium transition-colors duration-300" style={{ color: '#003300' }}>
                  {session.startTime} - {moment(endTime).format('h:mm A')} ({session.durationHours} hrs)
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-sm font-medium mb-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>Status</p>
            <Badge variant={session.status === 'approved' ? 'success' : 'default'}>
              {session.status}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                navigate('/reception/session-reports');
              }}
              className="flex-1"
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Go to Reports
            </Button>
            {session.status === 'approved' && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate('/reception/session-reports');
                  // The session reports page will show all approved sessions
                  // User can create report from there
                }}
                className="flex-1"
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Create Report
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Details"
      size="md"
    >
      <div className="space-y-6">
        {/* Event Header */}
        <div className="flex items-start gap-4">
          <div className={`w-4 h-4 rounded-full ${getColorClass(event.color || 'blue')} mt-1 flex-shrink-0`} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold transition-colors duration-300" style={{ color: '#003300' }}>{event.title}</h2>
            {event.description && (
              <p className="mt-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{event.description}</p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-3 bg-zinc-50 rounded-lg p-4 border border-zinc-200">
          <div className="flex items-center gap-3 transition-colors duration-300" style={{ color: '#003300' }}>
            <Calendar className="w-5 h-5" style={{ color: '#003300' + 'CC' }} />
            <div>
              <p className="text-sm font-medium transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>Date</p>
              <p className="font-medium transition-colors duration-300" style={{ color: '#003300' }}>{formatDate(event.startTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 transition-colors duration-300" style={{ color: '#003300' }}>
            <Clock className="w-5 h-5" style={{ color: '#003300' + 'CC' }} />
            <div>
              <p className="text-sm font-medium transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>Time</p>
              <p className="font-medium transition-colors duration-300" style={{ color: '#003300' }}>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5" style={{ color: '#003300' + 'CC' }} />
              <h3 className="font-semibold transition-colors duration-300" style={{ color: '#003300' }}>
                Participants ({event.participants.length})
              </h3>
            </div>

            <div className="space-y-2">
              {event.participants.map((participant, index) => {
                const display = getParticipantDisplay(participant);
                return (
                  <div
                    key={participant._id || index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      participant.type === 'company'
                        ? 'bg-purple-50 border-purple-100'
                        : participant.type === 'lead'
                        ? 'bg-cyan-50 border-cyan-100'
                        : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      participant.type === 'company'
                        ? 'bg-purple-100 text-purple-600'
                        : participant.type === 'lead'
                        ? 'bg-cyan-100 text-cyan-600'
                        : 'bg-[#003300]/20'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium transition-colors duration-300 ${
                        participant.type === 'company'
                          ? 'text-purple-900'
                          : participant.type === 'lead'
                          ? 'text-cyan-900'
                          : ''
                      }`} style={participant.type === 'custom' ? { color: '#003300' } : {}}>
                        {display.name}
                      </p>
                      <p className={`text-sm transition-colors duration-300 ${
                        participant.type === 'company'
                          ? 'text-purple-600'
                          : participant.type === 'lead'
                          ? 'text-cyan-600'
                          : ''
                      }`} style={participant.type === 'custom' ? { color: '#003300' + 'CC' } : {}}>
                        {display.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-zinc-200">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </Button>
          <Button
            variant="primary"
            onClick={onEdit}
            className="flex-1"
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            Edit Event
          </Button>
        </div>
      </div>
    </Modal>
  );
};
