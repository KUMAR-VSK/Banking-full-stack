import React, { useState, useEffect } from 'react';

function LoanManagerDashboard({ user, addNotification }) {
  const [loans, setLoans] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('APPLIED');

  useEffect(() => {
    fetchLoans();
    fetchDocuments();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loan-manager/loans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLoans(data);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      addNotification('Failed to fetch loans', 'error');
    }
  };

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents from /api/loan-manager/documents');
      const token = localStorage.getItem('token');
      console.log('Token present:', !!token);
      const response = await fetch('/api/loan-manager/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched documents:', data.length);
        setDocuments(data);
        setLoading(false);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        addNotification('Failed to fetch documents', 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      addNotification('Failed to fetch documents', 'error');
      setLoading(false);
    }
  };

  const handleVerifyLoan = async (loanId) => {
    try {
      const response = await fetch(`/api/loan-manager/loans/verify/${loanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('Loan application verified successfully', 'success');
        fetchLoans();
      } else {
        addNotification('Failed to verify loan application', 'error');
      }
    } catch (error) {
      console.error('Error verifying loan:', error);
      addNotification('Failed to verify loan application', 'error');
    }
  };

  const handleRejectLoan = async (loanId) => {
    try {
      const response = await fetch(`/api/loan-manager/loans/reject/${loanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('Loan application rejected successfully', 'success');
        fetchLoans();
      } else {
        addNotification('Failed to reject loan application', 'error');
      }
    } catch (error) {
      console.error('Error rejecting loan:', error);
      addNotification('Failed to reject loan application', 'error');
    }
  };

  const handleVerifyDocument = async (documentId) => {
    try {
      const response = await fetch(`/api/loan-manager/documents/verify/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('Document verified successfully', 'success');
        fetchDocuments();
        fetchLoans(); // Refresh loans to update verification status
      } else {
        addNotification('Failed to verify document', 'error');
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      addNotification('Failed to verify document', 'error');
    }
  };

  const handleRejectDocument = async (documentId) => {
    try {
      const response = await fetch(`/api/loan-manager/documents/reject/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        addNotification('Document rejected successfully', 'success');
        fetchDocuments();
        fetchLoans(); // Refresh loans to update verification status
      } else {
        addNotification('Failed to reject document', 'error');
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      addNotification('Failed to reject document', 'error');
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const getLoanDocuments = (loanId) => {
    return documents.filter(doc => doc.loanApplicationId === loanId);
  };

  const handleDocumentClick = async (documentId) => {
    try {
      console.log('Fetching document:', documentId);
      const response = await fetch(`/api/loan-manager/documents/view/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        addNotification('Failed to fetch document', 'error');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      addNotification('Failed to fetch document', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Loan Manager Dashboard</h2>
        <p>Verify documents and manage loan applications</p>
      </div>

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
              placeholder="Search by username or loan ID..."
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
              <th>User</th>
              <th>Amount</th>
              <th>Term (months)</th>
              <th>Purpose</th>
              <th>Documents</th>
              <th>Status</th>
              <th>Applied Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">No loans found</td>
              </tr>
            ) : (
              filteredLoans.map(loan => {
                const userDocuments = getLoanDocuments(loan.id);
                return (
                  <tr key={loan.id}>
                    <td>{loan.id}</td>
                    <td>{loan.username || 'N/A'}</td>
                    <td>₹{loan.amount?.toLocaleString()}</td>
                    <td>{loan.term} months</td>
                    <td>{loan.purpose}</td>
                    <td>
                      {userDocuments.length > 0 ? (
                        <div className="document-list">
                          {userDocuments.slice(0, 2).map(doc => (
                            <div key={doc.id} className="document-item">
                              <div className="document-info">
                                <button
                                  className={`document-link status-${doc.status.toLowerCase()}`}
                                  onClick={() => handleDocumentClick(doc.id)}
                                  title={`Click to view ${doc.fileName}`}
                                >
                                  👁️ {doc.fileName}
                                </button>
                                <span className={`status status-${doc.status.toLowerCase()}`}>
                                  {doc.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {userDocuments.length > 2 && (
                            <div className="document-item">
                              <span className="status status-verified">
                                +{userDocuments.length - 2} more
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="status status-rejected">No documents</span>
                      )}
                    </td>
                    <td><span className={`status ${getStatusBadge(loan.status)}`}>{loan.status}</span></td>
                    <td>{loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <div className="action-buttons flex space-x-2">
                        {loan.status === 'APPLIED' && (
                          <>
                            <button
                              onClick={() => handleVerifyLoan(loan.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleRejectLoan(loan.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {loan.status !== 'APPLIED' && (
                          <span className="completed-status">{loan.status}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LoanManagerDashboard;
