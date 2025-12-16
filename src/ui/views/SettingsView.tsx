import React from 'react';
import PlaybackStyleCard from '../components/settings/PlaybackStyleCard';
import PlaylistSettingsSection from '../components/settings/PlaylistSettingsSection';
import UpdateSection from '../components/settings/UpdateSection';

interface SettingsViewProps {
  coverStyle: 'normal' | 'vinyl';
  onCoverStyleChange: (style: 'normal' | 'vinyl') => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  coverStyle,
  onCoverStyleChange,
  onShowToast,
}) => (
  <div className="p-6 md:p-10 max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 mb-8">设置</h1>

    <div className="space-y-6">
      <PlaybackStyleCard coverStyle={coverStyle} onCoverStyleChange={onCoverStyleChange} />
      <PlaylistSettingsSection onShowToast={onShowToast} />
      <UpdateSection onShowToast={onShowToast} />
    </div>
  </div>
);

export default SettingsView;
