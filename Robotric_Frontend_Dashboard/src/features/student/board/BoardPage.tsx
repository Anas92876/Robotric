import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudentCourses } from '../../../hooks';
import { PageHeader } from '../../../ui';
import { GroupBoard } from '../../common/board/GroupBoard';

/** The board of one of the student's groups. */
export default function BoardPage() {
  const { groupId = '' } = useParams();
  const { t } = useTranslation('dashboardCommon');
  const { courses } = useStudentCourses();
  const course = courses.find((c) => c.groupId === groupId);
  return (
    <div className="space-y-5">
      <PageHeader
        back={course ? { to: `/student/courses/${course.course._id}`, label: course.course.title } : { to: '/student/courses', label: t('board.backCourses') }}
        title={t('board.title')}
        description={course ? t('board.subtitleFor', { course: course.course.title }) : t('board.subtitle')}
      />
      <GroupBoard groupId={groupId} role="student" />
    </div>
  );
}
