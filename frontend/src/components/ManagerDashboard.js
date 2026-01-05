import React, { useState, useEffect } from 'react';

function ManagerDashboard({ user, addNotification }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interestRates, setInterestRates] = useState([]);
  const [editingRates, setEditingRates] = useState({});
  const [activeTab, setActiveTab] = useState('loans');

  useEffect(() => {
    fetchLoans();
    fetchInterestRates();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/manager/loans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLoans(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      addNotification('Failed to fetch loans', 'error');
      setLoading(false);
    }
  };

  const fetchInterestRates = async () => {
    // Define all possible loan purposes with their default rates
    const allPurposes = [
      { purpose: 'home purchase', rate: 8.5 },
      { purpose: 'car purchase', rate: 9.5 },
      { purpose: 'education', rate: 7.5 },
      { purpose: 'business', rate: 10.5 },
      { purpose: 'personal', rate: 12.0 },
      { purpose: 'health', rate: 8.0 },
      { purpose: 'travel', rate: 11.0 },
      { purpose: 'wedding', rate: 9.0 },
      { purpose: 'home renovation', rate: 8.75 },
      { purpose: 'debt consolidation', rate: 11.5 }
    ];

    try {
      const response = await fetch('/api/manager/interest-rates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();

        // Create a map of existing rates
        const existingRatesMap = {};
        data.forEach(rate => {
          existingRatesMap[rate.purpose] = rate;
        });

        // Merge existing rates with defaults, prioritizing database values
        const mergedRates = allPurposes.map(purpose => {
          const existing = existingRatesMap[purpose.purpose];
          return existing ? { ...existing } : {
            id: null,
            purpose: purpose.purpose,
            rate: purpose.rate
          };
        });

        setInterestRates(mergedRates);
      } else {
        // If API fails, show default rates
        const defaultRates = allPurposes.map(purpose => ({
          id: null,
          purpose: purpose.purpose,
          rate: purpose.rate
        }));
        setInterestRates(defaultRates);
        addNotification('Using default interest rates', 'info');
      }
    } catch (error) {
      console.error('Error fetching interest rates:', error);
      // Show default rates even if API fails
      const defaultRates = allPurposes.map(purpose => ({
        id: null,
        purpose: purpose.purpose,
        rate: purpose.rate
      }));
      setInterestRates(defaultRates);
      addNotification('Failed to fetch interest rates, showing defaults', 'warning');
    }
  };

  const updateInterestRate = async (purpose, rate) => {
    try {
      const response = await fetch('/api/manager/interest-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ purpose, rate })
      });
      if (response.ok) {
        addNotification('Interest rate updated successfully', 'success');
        fetchInterestRates();
        setEditingRates(prev => ({ ...prev, [purpose]: false }));
      } else {
        const errorText = await response.text();
        console.error('Failed to update interest rate:', response.status, errorText);
        addNotification(`Failed to update interest rate: ${response.status} ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('Error updating interest rate:', error);
      addNotification('Failed to update interest rate: Network error', 'error');
    }
  };

  const handleApproveLoan = async (loanId) => {
    try {
      const response = await fetch(`/api/manager/loans/approve/${loanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('Loan approved successfully', 'success');
        fetchLoans();
      } else {
        addNotification('Failed to approve loan', 'error');
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      addNotification('Failed to approve loan', 'error');
    }
  };

  const handleRejectLoan = async (loanId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/manager/loans/reject/${loanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        addNotification('Loan rejected successfully', 'success');
        fetchLoans();
      } else {
        addNotification('Failed to reject loan', 'error');
      }
    } catch (error) {
      console.error('Error rejecting loan:', error);
      addNotification('Failed to reject loan', 'error');
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loan.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loan.userId?.toString().includes(searchTerm) ||
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Manager Dashboard</h2>
        <p>Review and approve loan applications, manage interest rates</p>
      </div>

<div className="tabs">
  <button
    className={`tab-button ${activeTab === 'loans' ? 'active' : ''}`}
    onClick={() => setActiveTab('loans')}
  >
    Loan Management
  </button>

  <button
    className={`tab-button ${activeTab === 'rates' ? 'active' : ''}`}
    onClick={() => setActiveTab('rates')}
  >
    Manage Interest Rate
  </button>
</div>

      {activeTab === 'loans' && (
        <>
          <div className="filters-section">
            <div className="filter-controls">
              <div className="filter-group">
                <label>Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="APPLIED">Applied</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by username, email, user ID, or loan ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Amount</th>
                  <th>Term (months)</th>
                  <th>Document Status</th>
                  <th>Applied Date</th>
                  <th>Actions</th>
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
                      <td>{loan.userId || 'N/A'}</td>
                      <td>{loan.username || 'N/A'}</td>
                      <td>₹{loan.amount?.toLocaleString()}</td>
                      <td>{loan.term} months</td>
                      <td><span className={`status ${getStatusBadge(loan.status)}`}>{loan.status}</span></td>
                      <td>{loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div className="action-buttons flex space-x-2">
                          {loan.status === 'VERIFIED' && (
                            <>
                              <button
                                onClick={() => handleApproveLoan(loan.id)}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectLoan(loan.id)}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {loan.status !== 'VERIFIED' && (
                            <span className="completed-status">{loan.status}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'rates' && (
        <div className="interest-rates-section">
          <h3>Manage Interest Rates</h3> <br/>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Loan Purpose</th>
                  <th>Interest Rate (%)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interestRates.map(rate => (
                  <tr key={rate.purpose}>
                    <td>
                      {rate.purpose.charAt(0).toUpperCase() + rate.purpose.slice(1).replace(' ', ' ')}
                      {rate.id === null && <span className="text-gray-500 text-sm ml-2">(default)</span>}
                    </td>
                    <td>
                      {editingRates[rate.purpose] ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="1"
                            max="25"
                            step="0.25"
                            defaultValue={rate.rate}
                            onChange={(e) => {
                              const slider = e.target;
                              const value = parseFloat(slider.value);
                              const display = slider.parentElement.querySelector('.rate-display');
                              if (display) display.textContent = value + '%';
                            }}
                            onMouseUp={(e) => updateInterestRate(rate.purpose, parseFloat(e.target.value))}
                            className="w-24"
                          />
                          <span className="rate-display w-12 text-center font-semibold" style={{ color: '#4B5563' }}>
                            {rate.rate}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#4B5563' }}>
                          {rate.rate}%
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setEditingRates(prev => ({ ...prev, [rate.purpose]: !prev[rate.purpose] }))}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
                      >
                        {editingRates[rate.purpose] ? 'Cancel' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;