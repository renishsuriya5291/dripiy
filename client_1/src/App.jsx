// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'sonner';
import { Toaster as ShadcnToaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import LinkedInAccounts from './features/linkedin/LinkedInAccounts';
import Campaigns from './features/campaign/Campaigns';
import CampaignBuilder from './features/campaign/CampaignBuilder';
import CampaignDetail from './features/campaign/CampaignDetail';
import Settings from './features/settings/Setting';
import NotFound from './components/common/NotFound';

// Auth
import { getLinkedInAccounts } from './features/linkedin/linkedinSlice';
import { getCampaigns } from './features/campaign/campaignSlice';
import LoadingAnimation from './components/common/LoadingAnimation';

function App() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data if user is logged in
    const loadInitialData = async () => {
      if (user) {
        await Promise.all([
          dispatch(getLinkedInAccounts()),
          dispatch(getCampaigns()),
        ]);
      }
      setLoading(false);
    };

    loadInitialData();
  }, [user, dispatch]);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <LoadingAnimation />;
    }
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" expand={false} richColors />
        <ShadcnToaster />
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Navigate to="/login" />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="linkedin-accounts" element={<LinkedInAccounts />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/new" element={<CampaignBuilder />} />
            <Route path="campaigns/edit/:id" element={<CampaignBuilder />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;