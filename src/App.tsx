import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { TagSettingsPageWrapper } from '@/pages/TagSettingsPageWrapper';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { TodoPage } from '@/pages/TodoPage';
import { JournalPage } from '@/pages/JournalPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TimeTracesHeatmap } from '@/components/TimeTracesHeatmap';
import { AttendancePrintPage } from '@/pages/AttendancePrintPage';
import { WeeklyViewPage } from '@/pages/WeeklyViewPage';

function App() {
  return (
    // 关键修改：添加 basename="/timetraces"
    // 注意：这里的 /timetraces 必须和你的 GitHub 仓库名完全一致（全小写）
    <BrowserRouter basename="/timetraces">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tag-settings/:tagId" element={<TagSettingsPageWrapper />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/todo" element={<TodoPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/weekly" element={<WeeklyViewPage />} />
        <Route path="/heatmap" element={<TimeTracesHeatmap />} />
        <Route path="/attendance-print/:tagId" element={<AttendancePrintPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;