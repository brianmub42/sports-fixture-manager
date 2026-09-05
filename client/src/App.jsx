import { Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { TimerProvider } from './contexts/TimerContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { useOrganization } from './contexts/OrganizationContext.jsx';
import SelectOrganization from './pages/SelectOrganization.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fixtures from './pages/Fixtures.jsx';
import LiveScores from './pages/LiveScores.jsx';
import Standings from './pages/Standings.jsx';
import LogStandings from './pages/LogStandings.jsx';
import Analytics from './pages/Analytics.jsx';
import Teams from './pages/Teams.jsx';
import UploadPage from './pages/UploadPage.jsx';
import GeneratePage from './pages/GeneratePage.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Brackets from './pages/Brackets.jsx';
import TvMode from './pages/TvMode.jsx';
import AthleticsPage from './pages/AthleticsPage.jsx';
import SuperadminDashboard from './pages/SuperadminDashboard.jsx';
import PublicWatchPage from './pages/PublicWatchPage.jsx';
import MediaManager from './pages/MediaManager.jsx';

function App() {
  const { activeOrg } = useOrganization();
  const isPublicBypassRoute = window.location.pathname.startsWith('/watch/') || window.location.pathname.startsWith('/reset-password');

  if (!activeOrg && !isPublicBypassRoute) {
    return <SelectOrganization />;
  }

  return (
    <ToastProvider>
      <SocketProvider>
        <TimerProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/live" element={<LiveScores />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/log" element={<LogStandings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/media" element={<MediaManager />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/brackets" element={<Brackets />} />
              <Route path="/athletics" element={<AthleticsPage />} />
              <Route path="/superadmin" element={<SuperadminDashboard />} />
            </Route>
            <Route path="/tv" element={<TvMode />} />
            <Route path="/watch/:eventSlug" element={<PublicWatchPage />} />
          </Routes>
        </TimerProvider>
      </SocketProvider>
    </ToastProvider>
  );
}

export default App;
