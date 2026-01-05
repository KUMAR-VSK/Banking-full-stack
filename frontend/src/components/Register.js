import React, { useState } from 'react';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Enter a valid email');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSuccess('🎉 Registration successful! Please login.');
        setFormData({ username: '', email: '', password: '' });
      } else {
        try {
          const data = await res.json();
          setError(data.error || data.message || 'Registration failed');
        } catch (parseError) {
          setError(`Registration failed with status ${res.status}`);
        }
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto backdrop-blur-2xl rounded-2xl p-10 shadow-2xl border border-gray-700/50 min-h-[500px] relative overflow-hidden" style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)' }}>
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 drop-shadow-lg">📝</div>
        <h2 className="text-gray-100 text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm mb-3">Create Account</h2>
        <p className="text-gray-300 text-lg">Join us to start your loan journey</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <div className="relative mb-6">
          <label className="block mb-2 text-gray-300 text-base font-semibold">Username</label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-primary-600 text-xl z-10 transition-all duration-300 opacity-70">👤</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
              className="w-full h-12 px-5 pl-14 border-2 border-gray-600 rounded-xl text-lg transition-all duration-300 bg-gray-800/90 backdrop-blur-sm shadow-sm focus:outline-none focus:border-primary-500 focus:shadow-lg focus:bg-gray-800 focus:-translate-y-0.5 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="relative mb-6">
          <label className="block mb-2 text-gray-700 text-base font-semibold">Email</label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-primary-600 text-xl z-10 transition-all duration-300 opacity-70">📧</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full h-12 px-5 pl-14 border-2 border-gray-600 rounded-xl text-lg transition-all duration-300 bg-gray-800/90 backdrop-blur-sm shadow-sm focus:outline-none focus:border-primary-500 focus:shadow-lg focus:bg-gray-800 focus:-translate-y-0.5 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="relative mb-6">
          <label className="block mb-2 text-gray-700 text-base font-semibold">Password</label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-primary-600 text-xl z-10 transition-all duration-300 opacity-70">🔒</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
              className="w-full h-12 px-5 pl-14 border-2 border-gray-600 rounded-xl text-lg transition-all duration-300 bg-gray-800/90 backdrop-blur-sm shadow-sm focus:outline-none focus:border-primary-500 focus:shadow-lg focus:bg-gray-800 focus:-translate-y-0.5 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        {error && <div className="p-4 rounded-xl mb-6 flex items-start gap-3 font-medium bg-red-50 text-red-700 border border-red-200">
          <span className="text-xl flex-shrink-0">⚠️</span>
          {error}
        </div>}
        {success && <div className="p-4 rounded-xl mb-6 flex items-start gap-3 font-medium bg-green-50 text-green-700 border border-green-200">
          <span className="text-xl flex-shrink-0">✅</span>
          {success}
        </div>}

        <button type="submit" className="bg-gradient-to-br from-primary-600 to-primary-800 text-white px-7 py-4 rounded-xl text-lg font-bold transition-all duration-300 shadow-lg flex items-center justify-center gap-3 mt-4 uppercase tracking-wide hover:bg-gradient-to-br hover:from-primary-700 hover:to-primary-900 hover:-translate-y-1 hover:scale-105 hover:shadow-xl active:translate-y-0 active:scale-100 active:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative" disabled={loading}>
          {loading && <span className="absolute top-1/2 left-1/2 w-6 h-6 -mt-3 -ml-3 border-2 border-white/30 rounded-full border-t-white animate-spin"></span>}
          {loading ? 'Creating...' : '🚀 Create Account'}
        </button>
      </form>

      <div className="text-center mt-8 pt-6 border-t border-purple-200/10">
        <p className="text-gray-300 text-base">Already have an account? <a href="/login" className="text-purple-400 font-bold transition-all duration-300 px-1 py-0.5 rounded hover:text-purple-300 hover:bg-purple-900/30 hover:-translate-y-0.5">Sign in</a></p>
      </div>
    </div>
  );
}

export default Register;
