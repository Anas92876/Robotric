/**
 * Schedule Page
 *
 * Reception schedule management using react-big-calendar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import localeData from 'dayjs/plugin/localeData';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from 'framer-motion';

dayjs.extend(localizedFormat);
dayjs.extend(localeData);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { Button, LoadingState, Alert } from '../../components/ui';
import { EventModal } from '../../components/reception/EventModal';
import { EventDetailsModal } from '../../components/reception/EventDetailsModal';
import { api } from '../../lib/api';
import { getAllSessionRequests } from '../../services/subscription.service';
import type { SessionRequest } from '../../services/subscription.service';

// Setup dayjs localizer for react-big-calendar
const localizer = dayjsLocalizer(dayjs);

interface Event {
  _id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  participants?: any[];
  createdBy?: any;
  type?: 'event' | 'subscription_session'; // Add type to distinguish
  sessionRequest?: SessionRequest; // Store full session request data if it's a subscription session
}

const Schedule: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState(Views.WEEK);
  const [date, setDate] = useState(new Date());

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch regular events and subscription sessions in parallel
      const [eventsResponse, subscriptionSessions] = await Promise.all([
        api.get('/reception/events').catch(() => ({ data: { events: [] } })),
        getAllSessionRequests({ status: 'approved' }).catch(() => []),
      ]);
      
      // Format regular events
      const formattedEvents: Event[] = eventsResponse.data.events.map((event: any) => ({
        ...event,
        _id: event._id,
        title: event.title,
        description: event.description,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        color: event.color || 'blue',
        type: 'event' as const,
        participants: event.participants,
        createdBy: event.createdBy,
      }));
      
      // Format subscription sessions as events
      const subscriptionEvents: Event[] = subscriptionSessions.map((session: SessionRequest) => {
        const user = typeof session.userId === 'object' ? session.userId : null;
        const sessionDate = new Date(session.date);
        const [hours, minutes] = session.startTime.split(':').map(Number);
        const startDateTime = new Date(sessionDate);
        startDateTime.setHours(hours, minutes, 0, 0);
        
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + session.durationHours);
        
        return {
          _id: `subscription_${session._id}`,
          title: `Private Session - ${user?.name || 'Student'}`,
          description: session.description || `Subscription session with ${user?.name || 'student'}`,
          start: startDateTime,
          end: endDateTime,
          startTime: startDateTime,
          endTime: endDateTime,
          color: 'purple', // Different color for subscription sessions
          type: 'subscription_session' as const,
          sessionRequest: session,
        };
      });
      
      // Combine both types of events
      const allEvents = [...formattedEvents, ...subscriptionEvents];
      
      setEvents(allEvents);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle slot selection (create new event)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setSelectedDate(start);
    setIsModalOpen(true);
  };

  // Handle event selection (show details)
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  // Handle edit from details modal
  const handleEditFromDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedDate(undefined);
    setIsModalOpen(true);
  };

  // Handle delete from details modal
  const handleDeleteFromDetails = async () => {
    if (selectedEvent) {
      await handleDelete(selectedEvent._id);
      setIsDetailsModalOpen(false);
      setSelectedEvent(null);
    }
  };

  // Handle modal submit
  const handleModalSubmit = async (data: any) => {
    try {
      if (selectedEvent) {
        // Update
        await api.put(`/reception/events/${selectedEvent._id}`, data);
      } else {
        // Create
        await api.post('/reception/events', data);
      }
      await fetchEvents();
      setIsModalOpen(false);
    } catch (err) {
      throw err; // Let modal handle error display
    }
  };

  // Handle event deletion
  const handleDelete = async (eventId: string) => {
    try {
      await api.delete(`/reception/events/${eventId}`);
      await fetchEvents();
    } catch (err) {
      throw err; // Let modal handle error display
    }
  };

  // Custom event styling
  const eventStyleGetter = (event: Event) => {
    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      green: '#22c55e',
      red: '#ef4444',
      yellow: '#eab308',
      purple: '#a855f7', // For subscription sessions
      gray: '#71717a',
    };

    const backgroundColor = colorMap[event.color || 'blue'];
    
    // Add border for subscription sessions to make them more distinct
    const borderStyle = event.type === 'subscription_session' 
      ? { border: '2px solid #9333ea', borderLeft: '4px solid #9333ea' }
      : {};

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontWeight: event.type === 'subscription_session' ? '600' : 'normal',
        ...borderStyle,
      },
    };
  };

  // Custom toolbar
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = dayjs(toolbar.date);
      return (
        <span className="text-xl font-bold text-zinc-800">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={goToBack}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToCurrent}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Today
          </button>
          {label()}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            {['month', 'week', 'day'].map((viewName) => (
              <button
                key={viewName}
                onClick={() => toolbar.onView(viewName)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                  toolbar.view === viewName
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {viewName}
              </button>
            ))}
          </div>
          
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedEvent(null);
              setSelectedDate(new Date());
              setIsModalOpen(true);
            }}
          >
            New Event
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading && !events.length) {
    return <LoadingState message="Loading schedule..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-3xl font-bold inline-block ${isRTL ? 'text-right' : 'text-left'}`} style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardReception:schedule.title', 'Schedule')}</h1>
          <p className={`mt-1 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardReception:schedule.subtitle', 'Manage meetings, events, and subscription sessions')}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500"></div>
          <span className="text-sm text-zinc-600">Subscription Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-zinc-600">Regular Events</span>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 h-[calc(100vh-200px)]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
          }}
          view={view}
          onView={(newView) => setView(newView)}
          date={date}
          onNavigate={(newDate) => setDate(newDate)}
          min={new Date(0, 0, 0, 10, 0, 0)} // 10:00 AM
          max={new Date(0, 0, 0, 19, 0, 0)} // 7:00 PM
          defaultView={Views.WEEK}
          views={['month', 'week', 'day']}
          step={30}
          timeslots={2}
        />
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
      />

      {/* Event Edit Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        selectedDate={selectedDate}
        onSubmit={handleModalSubmit}
        onDelete={handleDelete}
      />
    </motion.div>
  );
};

export default Schedule;
