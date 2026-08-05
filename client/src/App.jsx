import { Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { TimerProvider } from './contexts/TimerContext.jsx';
import { useOrganization } from './contexts/OrganizationContext.jsx';
import SelectOrganization from './pages/SelectOrganization.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fixtures from './pages/Fixtures.jsx';
import LiveScores from './pages/LiveScores.jsx';
import Standings from './pages/Standings.jsx';
import LogStandings from './pages/LogStandings.jsx';
import Analytics from './pages/Analytics.jsx';
import Districts from './pages/Districts.jsx';
import UploadPage from './pages/UploadPage.jsx';
import GeneratePage from './pages/GeneratePage.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Brackets from './pages/Brackets.jsx';
import TvMode from './pages/TvMode.jsx';

function App() {
  const { activeOrg } = useOrganization();

  if (!activeOrg) {
    return <SelectOrganization />;
  }

  return (
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
            <Route path="/districts" element={<Districts />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/brackets" element={<Brackets />} />
          </Route>
          <Route path="/tv" element={<TvMode />} />
        </Routes>
      </TimerProvider>
    </SocketProvider>
  );
}

export default App;
