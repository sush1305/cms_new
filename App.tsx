import React, { useState } from 'react';
import { User } from './types';
import { api } from './api.ts';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProgramDetail from './components/ProgramDetail';
import UserManagement from './components/UserManagement';
import LessonEditor from './components/LessonEditor';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

type Screen = 'dashboard' | 'program' | 'users' | 'lesson' | 'settings' | 'catalog';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [currentProgramId, setCurrentProgramId] = useState<string>('');
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');

  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', email);
      const response = await api.login(email, password);
      console.log('Login response:', response);
      setUser(response.user);
      try { localStorage.setItem('user', JSON.stringify(response.user)); } catch (e) { /* ignore */ }
    } catch (err: any) {
      // Bubble up error message to the login form
      throw new Error(err?.message || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    api.logout();
    try { localStorage.removeItem('user'); } catch (e) { /* ignore */ }
    setUser(null);
    setCurrentScreen('dashboard');
  };

  // Auto-login disabled - users must manually log in each session
  // Clear any stored auth data on page load to force login
  React.useEffect(() => {
    console.log('App mounted - clearing auth');
    try {
      localStorage.clear();
      sessionStorage.clear();
      api.logout();
      setUser(null);
      console.log('Auth cleared');
    } catch (err) {
      console.error('Error clearing auth:', err);
    }
  }, []);

  const handleViewProgram = (id: string) => {
    setCurrentProgramId(id);
    setCurrentScreen('program');
  };

  const handleViewUsers = () => {
    setCurrentScreen('users');
  };

  const handleEditLesson = (id: string) => {
    setCurrentLessonId(id);
    setCurrentScreen('lesson');
  };

  const handleViewSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const handleBackToProgram = () => {
    setCurrentScreen('program');
  };

  const setViewFromNavbar = (v: 'dashboard' | 'catalog' | 'users' | 'settings') => {
    if (v === 'catalog') {
      // For now, catalog navigates to the dashboard (could be a dedicated catalog page later)
      setCurrentScreen('dashboard');
    } else if (v === 'users') {
      setCurrentScreen('users');
    } else if (v === 'settings') {
      setCurrentScreen('settings');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  if (!user || !user.id || !user.username) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <div>
        <Navbar
          user={user}
          onLogout={handleLogout}
          setView={setViewFromNavbar}
          activeView={currentScreen}
          currentLanguage={currentLanguage}
          onLanguageChange={(lang) => setCurrentLanguage(lang)}
        />

        {currentScreen === 'program' && (
          <ProgramDetail
            id={currentProgramId}
            onBack={handleBackToDashboard}
            onEditLesson={handleEditLesson}
            role={user.role}
          />
        )}

        {currentScreen === 'users' && (
          <UserManagement
            onBack={handleBackToDashboard}
            userRole={user.role}
          />
        )}

        {currentScreen === 'lesson' && (
          <LessonEditor
            id={currentLessonId}
            onBack={handleBackToProgram}
            role={user.role}
          />
        )}

        {(currentScreen === 'dashboard' || currentScreen === 'catalog' || currentScreen === 'settings') && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onViewProgram={handleViewProgram}
            onViewUsers={handleViewUsers}
            onViewSettings={handleViewSettings}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
