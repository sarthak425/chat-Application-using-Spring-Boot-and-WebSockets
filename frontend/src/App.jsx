import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/chat' : '/login'} replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/chat" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
