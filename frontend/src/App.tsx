import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/Vault";
import Ask from "./pages/Ask";
import Remembrance from "./pages/Remembrance";

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      {/* Keying the routed subtree by path replays the entrance animation per page. */}
      <div key={location.pathname} className="rise">
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/archive" element={<Dashboard />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/remembrance" element={<Remembrance />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Layout>
  );
}
