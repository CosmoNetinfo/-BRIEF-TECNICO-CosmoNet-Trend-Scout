import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import App from './App.jsx';
import Login from './Login.jsx';
import './index.css';

function Root() {
  const [user, setUser]       = useState(undefined); // undefined = checking
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <App user={user} /> : <Login />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
