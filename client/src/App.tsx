import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import History from './pages/History';
import AnalysisDetail from './pages/AnalysisDetail';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ParticleBackground from './components/ParticleBackground';

// Her rota değişiminde en üste scroll yap
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Chat widget sadece giriş yapmış kullanıcılara, Home ve Landing dışındaki sayfalarda gösterilir.
function GlobalChat() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || pathname === '/' || pathname === '/analyze') return null;
  return <ChatWidget />;
}

// Footer: Login, Register ve Landing sayfaları hariç tüm sayfalarda göster.
// Landing kendi footer'ını içeriyor.
function GlobalFooter() {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/register' || pathname === '/') return null;
  return <Footer />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ParticleBackground />
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<AnalysisDetail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/" element={<Landing />} />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* Global chat widget — Home dışındaki sayfalarda (Home kendi ChatWidget'ını taşıyor) */}
        <GlobalChat />
        {/* Global footer — Login ve Register hariç tüm sayfalarda */}
        <GlobalFooter />
      </AuthProvider>
    </BrowserRouter>
  );
}
