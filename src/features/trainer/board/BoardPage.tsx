import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../ui';
import { GroupBoard } from '../../common/board/GroupBoard';

/** The board of one of the trainer's groups: the trainer can assign tasks to students. */
export default function BoardPage() {
  const { groupId = '' } = useParams();
  const { t } = useTranslation('dashboardCommon');
  const { t: tt } = useTranslation('dashboardTrainer');
  const group = useQuery({ queryKey: ['trainer', 'group', groupId], queryFn: async () => (await api.get(`/trainer/groups/${groupId}`)).data.data as { name: string; courseId?: { title: string } | null } });
  const members = useQuery({ queryKey: ['trainer', 'group', groupId, 'students'], queryFn: async () => ((await api.get(`/trainer/groups/${groupId}/students`)).data.data ?? []) as { _id: string; name: string }[] });
  const g = group.data;
  return (
    <div className="space-y-5">
      <PageHeader
        back={{ to: `/trainer/groups/${groupId}`, label: g?.name ?? tt('grp.groups') }}
        title={t('board.title')}
        description={g?.courseId?.title ? t('board.subtitleFor', { course: g.courseId.title }) : t('board.subtitle')}
      />
      <GroupBoard groupId={groupId} role="trainer" members={members.data ?? []} />
    </div>
  );
}
