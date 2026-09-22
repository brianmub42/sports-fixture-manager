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

// Mobile Web App imports (mirroring Expo React Native Mobile App)
import { MobileThemeProvider } from './mobile-app/contexts/MobileThemeContext.jsx';
import { MobileAuthProvider } from './mobile-app/contexts/MobileAuthContext.jsx';
import MobileAppShell from './mobile-app/components/MobileAppShell.jsx';
import MobileIndex from './mobile-app/pages/MobileIndex.jsx';
import MobileLogin from './mobile-app/pages/MobileLogin.jsx';
import MobileScorekeeperLayout from './mobile-app/pages/scorekeeper/MobileScorekeeperLayout.jsx';
import MobileScorekeeperFixtures from './mobile-app/pages/scorekeeper/MobileScorekeeperFixtures.jsx';
import MobileScorekeeperStandings from './mobile-app/pages/scorekeeper/MobileScorekeeperStandings.jsx';
import MobileScorekeeperSync from './mobile-app/pages/scorekeeper/MobileScorekeeperSync.jsx';
import MobileScorekeeperSettings from './mobile-app/pages/scorekeeper/MobileScorekeeperSettings.jsx';
import MobileViewerWatch from './mobile-app/pages/viewer/MobileViewerWatch.jsx';
import MobileViewerEvent from './mobile-app/pages/viewer/MobileViewerEvent.jsx';

function App() {
  const { activeOrg } = useOrganization();
  const isPublicBypassRoute =
    window.location.pathname.startsWith('/watch') ||
    window.location.pathname.startsWith('/reset-password') ||
    window.location.pathname.startsWith('/app');

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
            <Route path="/watch/display" element={<TvMode />} />
            <Route path="/watch/:eventSlug/display" element={<TvMode />} />
            <Route path="/watch/:eventSlug" element={<PublicWatchPage />} />

            {/* Mobile Web App (mirroring Expo React Native Mobile App interface & offline sync) */}
            <Route
              path="/app"
              element={
                <MobileThemeProvider>
                  <MobileAuthProvider>
                    <MobileAppShell />
                  </MobileAuthProvider>
                </MobileThemeProvider>
              }
            >
              <Route index element={<MobileIndex />} />
              <Route path="login" element={<MobileLogin />} />
              <Route path="viewer" element={<MobileViewerWatch />} />
              <Route path="viewer/:eventSlug" element={<MobileViewerEvent />} />
              <Route path="scorekeeper" element={<MobileScorekeeperLayout />}>
                <Route index element={<MobileScorekeeperFixtures />} />
                <Route path="fixtures" element={<MobileScorekeeperFixtures />} />
                <Route path="standings" element={<MobileScorekeeperStandings />} />
                <Route path="sync" element={<MobileScorekeeperSync />} />
                <Route path="settings" element={<MobileScorekeeperSettings />} />
              </Route>
            </Route>
          </Routes>
        </TimerProvider>
      </SocketProvider>
    </ToastProvider>
  );
}

export default App;
