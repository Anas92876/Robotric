/**
 * NotificationManagement Page
 *
 * Complete notification management interface for reception staff:
 * - Send custom push notifications to users
 * - Select target audience (all, course, group, or specific students)
 * - Compose notification messages
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/common/useNotifications';
import { NotificationForm } from '../../components/reception/NotificationForm';
import { CardComponent, CardBody, LoadingState, Alert, useToast } from '../../components/ui';
import { useTranslation } from 'react-i18next';

const NotificationManagement: React.FC = () => {
  const toast = useToast();
  const {
    isLoading,
    error,
    sendNotification,
    courses,
    groups,
    students,
    fetchCourses,
    fetchGroups,
    fetchStudents
  } = useNotifications();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  const [successMessage, setSuccessMessage] = useState<{
    usersNotified: number;
    targetType: string;
  } | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  /**
   * Handle notification submission
   */
  const handleSubmit = async (data: {
    title: string;
    body: string;
    targetType: 'all' | 'course' | 'group' | 'students';
    targetIds?: string | string[];
  }) => {
    try {
      const response = await sendNotification(data);
      const { usersNotified, targetType, error } = response.data;

      // Show success or warning message based on delivery result
      setSuccessMessage({
        usersNotified,
        targetType
      });

      if (usersNotified === 0) {
        // No users matched the selected target
        toast.error(
          'Notification was not delivered because no users were found for the selected audience.',
          ''
        );
      } else if (error) {
        // Some notifications may have failed at the push layer
        toast.error(
          `Notification sent to ${usersNotified} user(s), but some deliveries may have failed: ${error}`,
          ''
        );
      } else {
        // Happy path
        toast.success(
          `Notification sent successfully to ${usersNotified} user(s)`,
          ''
        );
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      toast.error(
        err.message || 'Failed to send notification',
        ''
      );
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 p-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-[#003300] mb-2">Notification Management</h1>
          <p className="text-[#003300]/60">
            Send push notifications to users, courses, groups, or specific students
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Bell className="h-6 w-6 text-primary" />
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert
            variant="error"
            icon={<AlertCircle className="h-5 w-5" />}
            title="Error"
            message={error}
          />
        </motion.div>
      )}

      {/* Success Message */}
      {successMessage && (
        <motion.div variants={itemVariants}>
          <Alert
            variant="success"
            icon={<CheckCircle className="h-5 w-5" />}
            title="Notification Sent Successfully"
            message={`Your notification has been sent to ${successMessage.usersNotified} user(s) (${successMessage.targetType}).`}
            onClose={() => setSuccessMessage(null)}
          />
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <LoadingState message="Loading notification data..." />
      )}

      {/* Notification Form */}
      <motion.div variants={itemVariants}>
        <NotificationForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          courses={courses}
          groups={groups}
          students={students}
          onFetchCourses={fetchCourses}
          onFetchGroups={fetchGroups}
          onFetchStudents={fetchStudents}
        />
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <CardComponent>
          <CardBody>
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#003300] mb-2">Notification Guidelines</h3>
                <ul className="space-y-1 text-sm text-[#003300]/70">
                  <li>• Title should be concise and clear (max 100 characters)</li>
                  <li>• Body message should be informative (max 500 characters)</li>
                  <li>• Select appropriate target audience for your notification</li>
                  <li>• Notifications are sent to users who have registered push tokens</li>
                  <li>• Users without push tokens will not receive notifications</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
};

export default NotificationManagement;
