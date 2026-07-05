import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import MembershipRequestPage from './pages/auth/MembershipRequestPage'
import SetPasswordPage from './pages/auth/SetPasswordPage'
import HomePage from './pages/HomePage'
import ApplicationPage from './pages/application/ApplicationPage'
import NewApplicationPage from './pages/application/NewApplicationPage'
import ApplyPage from './pages/apply/ApplyPage'
import InterviewPage from './pages/apply/InterviewPage'
import ApplyLayout from './components/layout/ApplyLayout'
import DocumentsPage from './pages/documents/DocumentsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import ProfilePage from './pages/profile/ProfilePage'
import NotificationsPage from './pages/notifications/NotificationsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 to-navy-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="FORSA" className="w-12 h-12 object-contain animate-pulse" />
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      {/* Phase 2 T-203 — genuinely public, no auth: Visitor -> Membership
          Request. Not gated on `user` like the routes above — a visitor by
          definition has no account yet, but if a logged-in member somehow
          lands here there's no harm in still showing the form. */}
      <Route path="/join" element={<MembershipRequestPage />} />
      {/* Phase 2 D-001/T-204 — consumes the one-time token emailed on
          membership approval. */}
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      {/* Apply flow — accessible while logged in */}
      <Route path="/apply" element={<ProtectedRoute><ApplyLayout><ApplyPage /></ApplyLayout></ProtectedRoute>} />
      <Route path="/apply/interview" element={<ProtectedRoute><ApplyLayout showBack={false}><InterviewPage /></ApplyLayout></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="application" element={<ApplicationPage />} />
        <Route path="application/new" element={<NewApplicationPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
