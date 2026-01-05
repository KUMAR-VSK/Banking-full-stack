import React, { useState, useEffect } from 'react';

function AdminDashboard({ user, addNotification }) {
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'USER'
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLoans();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/auth/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      addNotification('Failed to fetch users', 'error');
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/admin/loans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched loans data:', data);
        console.log('First loan user:', data[0]?.user);
        setLoans(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      addNotification('Failed to fetch loans', 'error');
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const response = await fetch('/auth/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setShowSuccess(true);
        addNotification('User created successfully', 'success');

        // Reset form after a short delay to show success animation
        setTimeout(() => {
          setNewUser({ username: '', password: '', email: '', role: 'USER' });
          setPasswordStrength(0);
          setFormErrors({});
          setShowSuccess(false);
          setShowCreateUserForm(false);
          fetchUsers();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || 'Unknown error';

        // Handle specific error types
        if (errorMessage.includes('username')) {
          setFormErrors({ username: errorMessage });
        } else if (errorMessage.includes('email')) {
          setFormErrors({ email: errorMessage });
        } else {
          setFormErrors({ general: errorMessage });
        }

        addNotification(`Failed to create user: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setFormErrors({ general: 'Network error. Please try again.' });
      addNotification('Failed to create user. Please check your connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    const confirmMessage = user 
      ? `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
      : 'Are you sure you want to delete this user?';
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('User deleted successfully', 'success');
        fetchUsers();
      } else {
        addNotification('Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      addNotification('Failed to delete user', 'error');
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;

    try {
      const deletePromises = selectedUsers.map(userId =>
        fetch(`/auth/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(response => response.ok).length;

      if (successCount > 0) {
        addNotification(`${successCount} users deleted successfully`, 'success');
        setSelectedUsers([]);
        setSelectAll(false);
        fetchUsers();
      }
      if (successCount < selectedUsers.length) {
        addNotification(`${selectedUsers.length - successCount} users failed to delete`, 'error');
      }
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      addNotification('Failed to delete users', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusClasses = {
      'APPLIED': 'status-applied',
      'VERIFIED': 'status-verified',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected'
    };
    return statusClasses[status] || 'status-applied';
  };

  const getRoleBadge = (role) => {
    return `role-badge ${role}`;
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsers = () => {
    const userData = filteredUsers.map(user => ({
      ID: user.id,
      Username: user.username,
      Email: user.email,
      Role: user.role,
      CreatedDate: new Date(user.createdAt).toLocaleDateString()
    }));
    exportToCSV(userData, `users_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportLoans = () => {
    const loanData = filteredLoans.map(loan => ({
      LoanID: loan.id,
      Username: loan.user?.username || 'N/A',
      Amount: loan.amount || 0,
      TermMonths: loan.term,
      Status: loan.status,
      AppliedDate: loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : 'N/A',
      LoanManager: loan.loanManager?.username || 'Not Assigned',
      Manager: loan.manager?.username || 'Not Assigned'
    }));
    exportToCSV(loanData, `loans_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength) => {
    if (strength === 0) return { text: '', color: '' };
    if (strength <= 2) return { text: 'Weak', color: '#dc3545' };
    if (strength <= 3) return { text: 'Medium', color: '#ffc107' };
    return { text: 'Strong', color: '#28a745' };
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!newUser.username.trim()) {
      errors.username = 'Username is required';
    } else if (newUser.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!newUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!newUser.password) {
      errors.password = 'Password is required';
    } else if (newUser.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 3) {
      errors.password = 'Password is too weak';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change with strength calculation
  const handlePasswordChange = (password) => {
    setNewUser({ ...newUser, password });
    setPasswordStrength(calculatePasswordStrength(password));
    // Clear password error when user starts typing
    if (formErrors.password) {
      setFormErrors({ ...formErrors, password: '' });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Manage users and oversee loan applications</p>
        </div>

        {/* Loading Skeletons */}
        <div className="stats-overview">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-text large" style={{width: '60px', height: '40px', marginBottom: '10px'}}></div>
              <div className="skeleton skeleton-text medium" style={{width: '80px'}}></div>
              <div className="skeleton skeleton-text small" style={{width: '40px'}}></div>
            </div>
          ))}
        </div>


        <div className="tabs-section">
          <div className="skeleton" style={{width: '180px', height: '50px', borderRadius: '12px'}}></div>
          <div className="skeleton" style={{width: '180px', height: '50px', borderRadius: '12px'}}></div>
        </div>

        <div className="table-container">
          <div className="skeleton" style={{width: '100%', height: '400px', borderRadius: '12px'}}></div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    totalLoans: loans.length,
    approvedLoans: loans.filter(loan => loan.status === 'APPROVED').length,
    pendingLoans: loans.filter(loan => loan.status === 'APPLIED' || loan.status === 'VERIFIED').length,
    rejectedLoans: loans.filter(loan => loan.status === 'REJECTED').length,
    totalLoanAmount: loans.reduce((sum, loan) => sum + (loan.amount || 0), 0),
    approvedAmount: loans.filter(loan => loan.status === 'APPROVED').reduce((sum, loan) => sum + (loan.amount || 0), 0),
    verifiedLoans: loans.filter(loan => loan.status === 'VERIFIED').length,
    appliedLoans: loans.filter(loan => loan.status === 'APPLIED').length,
    averageLoanAmount: loans.length > 0 ? Math.round(loans.reduce((sum, loan) => sum + (loan.amount || 0), 0) / loans.length) : 0
  };

  // Calculate approval rate
  const approvalRate = stats.totalLoans > 0 
    ? Math.round((stats.approvedLoans / stats.totalLoans) * 100) 
    : 0;


  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <p>Manage users and oversee loan applications</p>
      </div>

      {/* Enhanced Statistics Overview */}
      <div className="stats-overview">
        <div className="stat-card enhanced">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card enhanced">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-number">{stats.totalLoans}</div>
            <div className="stat-label">Total Loans</div>
            {approvalRate > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                {approvalRate}% approval rate
              </div>
            )}
          </div>
          {stats.pendingLoans > 0 && (
            <div className="notification-badge warning">
              {stats.pendingLoans} pending
            </div>
          )}
        </div>
        <div className="stat-card enhanced">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-number">{stats.approvedLoans}</div>
            <div className="stat-label">Approved Loans</div>
          </div>
        </div>
        <div className="stat-card enhanced">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-number">{stats.pendingLoans}</div>
            <div className="stat-label">Pending Loans</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.appliedLoans} applied, {stats.verifiedLoans} verified
            </div>
          </div>
          {stats.pendingLoans > 5 && (
            <div className="notification-badge urgent">
              High priority
            </div>
          )}
        </div>
        <div className="stat-card enhanced">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-number">{stats.rejectedLoans}</div>
            <div className="stat-label">Rejected Loans</div>
          </div>
        </div>
        <div className="stat-card enhanced">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="stat-number">₹{(stats.approvedAmount / 10000000).toFixed(1)}Cr</div>
            <div className="stat-label">Approved Amount</div>
            {stats.averageLoanAmount > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                Avg: ₹{(stats.averageLoanAmount / 100000).toFixed(1)}L
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="actions-grid">
          <button
            className="action-btn primary"
            onClick={() => setShowCreateUserForm(true)}
          >
            <span className="action-icon">👤</span>
            <span className="action-text">Create User</span>
          </button>
          <button
            className="action-btn secondary"
            onClick={() => setActiveTab('users')}
          >
            <span className="action-icon">📊</span>
            <span className="action-text">Manage Users</span>
          </button>
          <button
            className="action-btn secondary"
            onClick={() => setActiveTab('loans')}
          >
            <span className="action-icon">💰</span>
            <span className="action-text">Review Loans</span>
          </button>
          <button
            className="action-btn info"
            onClick={exportUsers}
            disabled={filteredUsers.length === 0}
          >
            <span className="action-icon">📈</span>
            <span className="action-text">Export Data</span>
          </button>
        </div>
      </div>


      <div className="tabs-section">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`tab-button ${activeTab === 'loans' ? 'active' : ''}`}
          onClick={() => setActiveTab('loans')}
        >
          Loan Oversight
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="create-user-form">
            <button
              onClick={() => setShowCreateUserForm(!showCreateUserForm)}
              className="create-user-btn"
            >
              {showCreateUserForm ? 'Cancel' : '👤 Create New User'}
            </button>

            {showCreateUserForm && (
              <div className="create-user-modal-overlay">
                <div className={`create-user-modal ${showSuccess ? 'success' : ''}`}>
                  <div className="modal-header">
                    <h3>
                      {showSuccess ? '✅ User Created Successfully!' : '👤 Create New User'}
                    </h3>
                    {!isSubmitting && !showSuccess && (
                      <button
                        type="button"
                        onClick={() => setShowCreateUserForm(false)}
                        className="modal-close-btn"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {showSuccess ? (
                    <div className="success-content">
                      <div className="success-icon">🎉</div>
                      <p>The user has been created successfully and can now log in to the system.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateUser} className="create-user-form-content">
                      {formErrors.general && (
                        <div className="error-message">
                          <span className="error-icon">⚠️</span>
                          {formErrors.general}
                        </div>
                      )}

                      <div className="form-row">
                        <div className="form-group">
                          <label>👤 Username</label>
                          <div className="input-wrapper">
                            <span className="field-icon">👤</span>
                            <input
                              type="text"
                              value={newUser.username}
                              onChange={(e) => {
                                setNewUser({...newUser, username: e.target.value});
                                if (formErrors.username) setFormErrors({...formErrors, username: ''});
                              }}
                              placeholder="Enter username"
                              className={formErrors.username ? 'error' : ''}
                              disabled={isSubmitting}
                            />
                          </div>
                          {formErrors.username && (
                            <span className="field-error">{formErrors.username}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <label>📧 Email Address</label>
                          <div className="input-wrapper">
                            <span className="field-icon">📧</span>
                            <input
                              type="email"
                              value={newUser.email}
                              onChange={(e) => {
                                setNewUser({...newUser, email: e.target.value});
                                if (formErrors.email) setFormErrors({...formErrors, email: ''});
                              }}
                              placeholder="Enter email address"
                              className={formErrors.email ? 'error' : ''}
                              disabled={isSubmitting}
                            />
                          </div>
                          {formErrors.email && (
                            <span className="field-error">{formErrors.email}</span>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>🔒 Password</label>
                          <div className="input-wrapper">
                            <span className="field-icon">🔒</span>
                            <input
                              type="password"
                              value={newUser.password}
                              onChange={(e) => handlePasswordChange(e.target.value)}
                              placeholder="Enter secure password"
                              className={formErrors.password ? 'error' : ''}
                              disabled={isSubmitting}
                            />
                          </div>

                          {newUser.password && (
                            <div className="password-strength">
                              <div className="strength-bar">
                                <div
                                  className={`strength-fill ${getPasswordStrengthText(passwordStrength).text.toLowerCase()}`}
                                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span
                                className="strength-text"
                                style={{ color: getPasswordStrengthText(passwordStrength).color }}
                              >
                                {getPasswordStrengthText(passwordStrength).text}
                              </span>
                            </div>
                          )}

                          {formErrors.password && (
                            <span className="field-error">{formErrors.password}</span>
                          )}

                          <div className="password-hint">
                            Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.
                          </div>
                        </div>

                        <div className="form-group">
                          <label>🎭 User Role</label>
                          <div className="input-wrapper">
                            <span className="field-icon">🎭</span>
                            <select
                              value={newUser.role}
                              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                              disabled={isSubmitting}
                            >
                              <option value="USER">👤 Regular User</option>
                              <option value="LOAN_MANAGER">💼 Loan Manager</option>
                              <option value="MANAGER">👔 Manager</option>
                              <option value="ADMIN">⚡ Administrator</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="modal-actions">
                        <button
                          type="button"
                          onClick={() => setShowCreateUserForm(false)}
                          className="cancel-btn"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="create-user-submit-btn"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="loading-spinner"></span>
                              Creating User...
                            </>
                          ) : (
                            <>
                              <span>✅</span>
                              Create User
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="table-header">
            <div className="table-title">
              <h4>User Management</h4>
              <span className="record-count">{filteredUsers.length} of {users.length} users</span>
            </div>
            <div className="table-actions">
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <button
                onClick={exportUsers}
                className="export-btn"
                disabled={filteredUsers.length === 0}
                title="Export users to CSV"
              >
                📊 Export Users
              </button>
              {selectedUsers.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bulk-delete-btn"
                  title={`Delete ${selectedUsers.length} selected users`}
                >
                  🗑️ Delete Selected ({selectedUsers.length})
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          disabled={user.username === 'admin'}
                        />
                      </td>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td><span className={getRoleBadge(user.role)}>{user.role}</span></td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="delete-btn"
                          disabled={user.username === 'admin'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="tab-content">
          <div className="filters-section">
            <div className="table-header">
              <div className="table-title">
                <h4>Loan Oversight</h4>
                <span className="record-count">{filteredLoans.length} of {loans.length} loans</span>
              </div>
            </div>
            <div className="filter-controls">
              <div className="filter-group">
                <label>Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Statuses ({loans.length})</option>
                  <option value="APPLIED">Applied ({stats.appliedLoans})</option>
                  <option value="VERIFIED">Verified ({stats.verifiedLoans})</option>
                  <option value="APPROVED">Approved ({stats.approvedLoans})</option>
                  <option value="REJECTED">Rejected ({stats.rejectedLoans})</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Search</label>
                <div className="search-container">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by username or loan ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              <div className="filter-group">
                <label>&nbsp;</label>
                <button
                  onClick={exportLoans}
                  className="export-btn"
                  disabled={filteredLoans.length === 0}
                  title="Export loans to CSV"
                >
                  📊 Export Loans
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Term (months)</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Loan Manager</th>
                  <th>Manager</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">No loans found</td>
                  </tr>
                ) : (
                  filteredLoans.map(loan => (
                    <tr key={loan.id}>
                      <td>{loan.id}</td>
                      <td>{loan.user?.username || 'N/A'}</td>
                      <td>₹{loan.amount?.toLocaleString()}</td>
                      <td>{loan.term} months</td>
                      <td><span className={`status ${getStatusBadge(loan.status)}`}>{loan.status}</span></td>
                      <td>{loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{loan.loanManager?.username || 'Not Assigned'}</td>
                      <td>{loan.manager?.username || 'Not Assigned'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;