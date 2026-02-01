import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { TagSettings } from '@/types';
import { TagSettingsPage } from './TagSettingsPage';
import type { OwnerDisplayNames } from './TagSettingsPage';

import { STORAGE_KEY_TAG_SETTINGS, STORAGE_KEY_OWNER_NAMES } from '@/constants/storage';
const DEFAULT_OWNER_NAMES: OwnerDisplayNames = { Julia: '用户1', Maruko: '用户2' };

/** 以 tagId 为 key 的配置存储 */
type TagSettingsMap = Record<string, TagSettings>;

/** 从「+新增标签」跳转时通过 state 传入的预设所有者 */
type TagSettingsLocationState = { owner?: 'Julia' | 'Maruko' } | null;

export function TagSettingsPageWrapper() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TagSettingsLocationState;
  const presetOwner = state?.owner ?? 'Julia';

  const [settingsMap, setSettingsMap] = useLocalStorage<TagSettingsMap>(
    STORAGE_KEY_TAG_SETTINGS,
    {}
  );
  const [ownerNames] = useLocalStorage<OwnerDisplayNames>(
    STORAGE_KEY_OWNER_NAMES,
    DEFAULT_OWNER_NAMES
  );

  if (!tagId) {
    navigate('/');
    return null;
  }

  const tag = settingsMap[tagId] ?? {
    id: tagId,
    name: '',
    owner: presetOwner,
    trackingOptions: {},
  };

  const onSave = (config: TagSettings) => {
    setSettingsMap((prev) => {
      const next = { ...prev };
      next[config.id] = { ...config, archived: prev[config.id]?.archived ?? false };
      return next;
    });
    navigate('/');
  };

  const onCancel = () => {
    navigate('/');
  };

  const onDelete = () => {
    setSettingsMap((prev) => {
      const next = { ...prev };
      delete next[tagId];
      return next;
    });
    navigate('/');
  };

  const onViewAttendancePrint = () =>
    navigate(`/attendance-print/${encodeURIComponent(tagId)}`);

  return (
    <TagSettingsPage
      tag={tag}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      onViewAttendancePrint={onViewAttendancePrint}
      ownerDisplayNames={ownerNames}
    />
  );
}
