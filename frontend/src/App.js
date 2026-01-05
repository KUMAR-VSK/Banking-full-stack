import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoanManagerDashboard from './components/LoanManagerDashboard';
import ManagerDashboard from './components/ManagerDashboard';

// App component that manages state
function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({ userId: userData.id, username: userData.username, role: userData.role });
          // Update localStorage with fresh data
          localStorage.setItem('userId', userData.id);
          localStorage.setItem('username', userData.username);
          localStorage.setItem('role', userData.role);
        } else {
          // Invalid token, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
        }
      } catch (error) {
        // Network error or server down, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
      }
    };

    validateToken();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, message, type, duration };
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleLogin = (response) => {
    localStorage.setItem('token', response.token);
    localStorage.setItem('userId', response.userId);
    localStorage.setItem('username', response.username);
    localStorage.setItem('role', response.role);
    setUser({ userId: response.userId, username: response.username, role: response.role });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setUser(null);
  };

  const toggleRole = () => {
    // Only allow role switching for testuser
    if (user.username !== 'testuser') {
      return;
    }
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    localStorage.setItem('role', newRole);
    setUser({ ...user, role: newRole });
  };

  // Create router with state passed to components
  const router = createBrowserRouter([
    {
      path: "/login",
      element: user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
    },
    {
      path: "/register",
      element: <Register />
    },
    {
      path: "/",
      element: user ? (
        user.role === 'ADMIN' ? <Navigate to="/admin" /> :
        user.role === 'LOAN_MANAGER' ? <Navigate to="/loan-manager" /> :
        user.role === 'MANAGER' ? <Navigate to="/manager" /> :
        <Navigate to="/user" />
      ) : <Navigate to="/login" />
    },
    {
      path: "/user",
      element: user && user.role === 'USER' ? <UserDashboard user={user} addNotification={addNotification} /> : <Navigate to="/login" />
    },
    {
      path: "/loan-manager",
      element: user && user.role === 'LOAN_MANAGER' ? <LoanManagerDashboard user={user} addNotification={addNotification} /> : <Navigate to="/login" />
    },
    {
      path: "/manager",
      element: user && user.role === 'MANAGER' ? <ManagerDashboard user={user} addNotification={addNotification} /> : <Navigate to="/login" />
    },
    {
      path: "/admin",
      element: user && user.role === 'ADMIN' ? <AdminDashboard user={user} addNotification={addNotification} /> : <Navigate to="/login" />
    }
  ]);

  return (
    <div className="font-sans w-full p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 bg-fixed min-h-screen relative">
      {/* Notification Container */}
      <div className="fixed top-24 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg p-4 shadow-lg border-l-4 cursor-pointer transition-all duration-300 flex items-center gap-3 max-w-sm ${
              notification.type === 'success' ? 'border-l-green-500 bg-green-50' :
              notification.type === 'error' ? 'border-l-red-500 bg-red-50' :
              notification.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-blue-500 bg-blue-50'
            }`}
            onClick={() => removeNotification(notification.id)}
          >
            <span className="text-lg">
              {notification.type === 'success' ? '✅' :
               notification.type === 'error' ? '❌' :
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800">{notification.message}</span>
            <button
              className="text-gray-500 hover:text-gray-700 text-lg leading-none"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <header className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white p-6 rounded-xl mb-6 shadow-2xl backdrop-blur-md border border-yellow-500/20 relative overflow-hidden">
        <div className="flex justify-between items-center w-full">
          <h1 className="m-0 text-4xl flex-shrink-0">Bank Loan Management System</h1>
          <nav className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="bg-white/20 border border-white/30 text-white px-3 py-2 rounded-lg cursor-pointer text-xl transition-all mr-4 backdrop-blur-sm hover:bg-white/30 hover:scale-105" title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-100">Welcome, {user.username}</span>
                {user.username === 'testuser' && (
                  <button onClick={toggleRole} className="bg-white/20 border border-white/30 text-white px-4 py-2 rounded cursor-pointer text-sm transition-colors hover:bg-white/30">
                    Switch to {user.role === 'ADMIN' ? 'User' : 'Admin'}
                  </button>
                )}
                <button onClick={handleLogout} className="bg-white/20 border border-white/30 text-white px-4 py-2 rounded cursor-pointer text-sm transition-colors hover:bg-white/30">Logout</button>
              </div>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => window.location.href = '/login'} className="text-white no-underline px-5 py-2.5 rounded transition-colors font-medium hover:bg-white/20">Login</button>
                <button onClick={() => window.location.href = '/register'} className="text-white no-underline px-5 py-2.5 rounded transition-colors font-medium bg-white/10 border border-white/30 hover:bg-white/30">Register</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="backdrop-blur-xl rounded-2xl p-6 md:p-8 lg:p-10 shadow-xl border border-gray-700/50 min-h-[500px] relative overflow-hidden w-full" style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
        <RouterProvider router={router} />
      </main>
    </div>
  );
}

export default App;
