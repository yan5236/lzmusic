import React from 'react';
import ThemeSettingsCard from '../components/Settings/ThemeSettingsCard';
import DarkModeSettingsCard from '../components/Settings/DarkModeSettingsCard';
import PlaybackStyleCard from '../components/Settings/PlaybackStyleCard';
import PlaylistImportExport from '../components/PlaylistImportExport';
import UpdateSection from '../components/Settings/UpdateSection';
import CloseBehaviorSettingsCard from '../components/Settings/CloseBehaviorSettingsCard';
import AboutSection from '../components/Settings/AboutSection';
import type { ThemeMode } from '../utils/themeMode';

interface SettingsViewProps {
  themeColor: string;
  onThemeColorChange: (color: string) => void;
  themeMode: ThemeMode;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
  onThemeModeChange: (mode: ThemeMode) => void;
  coverStyle: 'normal' | 'vinyl';
  onCoverStyleChange: (style: 'normal' | 'vinyl') => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  themeColor,
  onThemeColorChange,
  themeMode,
  systemTheme,
  resolvedTheme,
  onThemeModeChange,
  coverStyle,
  onCoverStyleChange,
  onShowToast,
}) => (
  <div className="p-6 md:p-10 max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 mb-8">设置</h1>

    <div className="space-y-6">
      <ThemeSettingsCard
        themeColor={themeColor}
        onThemeColorChange={onThemeColorChange}
        onShowToast={onShowToast}
      />
      <DarkModeSettingsCard
        themeMode={themeMode}
        systemTheme={systemTheme}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={onThemeModeChange}
      />
      <CloseBehaviorSettingsCard onShowToast={onShowToast} />
      <PlaybackStyleCard coverStyle={coverStyle} onCoverStyleChange={onCoverStyleChange} />
      <PlaylistImportExport onShowToast={onShowToast} />
      <UpdateSection onShowToast={onShowToast} />
      <AboutSection />
    </div>
  </div>
);

export default SettingsView;
