import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    console.log("🔐 ProtectedRoute: Auth still loading...");
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div className="text-white text-lg">Loading...</div>
          <div className="text-gray-500 text-sm" style={{ marginTop: '8px' }}>Please wait</div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("🔐 ProtectedRoute: No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("🔐 ProtectedRoute: User authenticated, rendering page");
  return <>{children}</>;
}
