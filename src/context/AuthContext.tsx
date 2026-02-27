import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if employee is logged in (not in Firebase Auth)
    const loginType = localStorage.getItem("loginType");
    const employeeEmail = localStorage.getItem("employeeEmail");
    
    console.log("🔐 AuthContext: Initializing auth check...", { loginType, employeeEmail });
    
    // Safety timeout - force loading to false after 3 seconds
    const timeoutId = setTimeout(() => {
      console.warn("⏱️ AuthContext: Auth check timeout - forcing loading to false");
      setLoading(false);
    }, 3000);
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId);
      console.log("🔐 AuthContext: Auth state changed -", currentUser ? "User logged in" : "No user");
      
      if (currentUser) {
        // Owner logged in (Firebase Auth)
        console.log("✅ AuthContext: Owner user found:", currentUser.email);
        setUser(currentUser);
      } else if (loginType === "employee" && employeeEmail) {
        // Employee logged in (not in Firebase Auth, create pseudo user)
        console.log("✅ AuthContext: Employee user found:", employeeEmail);
        const pseudoUser = {
          uid: `employee-${employeeEmail}`,
          email: employeeEmail,
          emailVerified: true,
          displayName: null,
          photoURL: null,
          phoneNumber: null,
          metadata: {
            creationTime: undefined,
            lastSignInTime: undefined,
          },
          isAnonymous: false,
          tenantId: null,
          providerData: [],
          delete: async () => {},
          getIdToken: async () => "",
          getIdTokenResult: async () => ({
            token: "",
            expirationTime: "",
            authTime: "",
            issuedAtTime: "",
            signInProvider: "custom",
            signInSecondFactor: null,
            claims: {},
          }),
          reload: async () => {},
          toJSON: () => ({
            uid: `employee-${employeeEmail}`,
            email: employeeEmail,
          }),
        } as any;
        setUser(pseudoUser);
      } else {
        console.log("❌ AuthContext: No user found (will redirect to login)");
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
