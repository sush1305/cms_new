import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api';

interface UserManagementProps {
  onBack: () => void;
  userRole: Role;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, userRole }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: Role.EDITOR
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setNewUser({ username: '', email: '', password: '', role: Role.EDITOR });
      setShowCreateForm(false);
      loadUsers();
    } catch (error) {
      setError('Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  const handleUpdateRole = async (id: string, role: Role) => {
    try {
      await api.updateUser(id, { role });
      loadUsers();
    } catch (error) {
      setError('Failed to update user role');
    }
  };

  if (userRole !== Role.ADMIN) {
    return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Access Denied</div>;
  }

  if (loading) {
    return <div className="p-20 text-center"><div className="animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">Dashboard</button>
        <span>/</span>
        <span className="text-slate-900">User Management</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">User Management</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage team members and their access levels.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-black text-amber-400 hover:bg-slate-800 font-black py-4 px-8 rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          <span className="text-xs uppercase tracking-widest">Add User</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-black border border-red-100 text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-12">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all uppercase tracking-tight"
                    aria-label="Username"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                    aria-label="Email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                    aria-label="Password"
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="new-user-role" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                  <select
                    id="new-user-role"
                    aria-label="Role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                  >
                    {Object.values(Role).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-black text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all transform active:scale-95"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-12">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">Team Members</h3>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-black text-amber-400 rounded-xl flex items-center justify-center font-black text-lg uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{user.username}</h4>
                    <p className="text-slate-500 text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value as Role)}
                    className="bg-white border-2 border-slate-100 rounded-xl py-2 px-4 focus:border-amber-400 outline-none font-bold text-slate-900 text-sm"
                    aria-label="User Role"
                  >
                    {Object.values(Role).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete User"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
