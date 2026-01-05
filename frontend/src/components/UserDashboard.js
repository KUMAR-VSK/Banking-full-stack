import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import IntegratedLoanCalculator from './IntegratedLoanCalculator';

ChartJS.register(ArcElement, Tooltip, Legend);

function UserDashboard({ user }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    amount: 1000000, // ₹10L default
    termYears: 10, // 10 years default
    purpose: '',
    interestRate: 8.5 // 8.5% default
  });
  const [message, setMessage] = useState('');

  // Document upload state
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documentMessage, setDocumentMessage] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest first

  useEffect(() => {
    fetchLoans();
    fetchDocuments();
  }, []);

  const calculateEMI = (principal, annualRate, tenureYears) => {
    if (!principal || !annualRate || !tenureYears) return 0;
    const tenureMonths = tenureYears * 12;
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  };

  const calculateTotalPayment = (principal, annualRate, tenureYears) => {
    const emi = calculateEMI(principal, annualRate, tenureYears);
    return emi * tenureYears * 12;
  };

  const calculateTotalInterest = (principal, annualRate, tenureYears) => {
    const totalPayment = calculateTotalPayment(principal, annualRate, tenureYears);
    return totalPayment - principal;
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/loans', {
        headers: { Authorization: `Bearer ${token}` }
      });

      let loansData = response.data;

      // Handle different response formats
      if (Array.isArray(loansData)) {
        setLoans(loansData);
      } else if (loansData && typeof loansData === 'object') {
        // Check if it's a paginated response
        if (loansData.content && Array.isArray(loansData.content)) {
          setLoans(loansData.content);
        } else if (loansData.data && Array.isArray(loansData.data)) {
          setLoans(loansData.data);
        } else {
          setLoans([]);
        }
      } else {
        setLoans([]);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data || error.message);
      setMessage('Failed to load loans: ' + (error.response?.data?.message || error.message));
      setLoans([]); // Ensure loans is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure response.data is an array
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]); // Ensure documents is always an array
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setDocumentMessage('File size must be less than 10MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setDocumentMessage('Please upload a PDF, JPEG, or PNG file');
        return;
      }
      setSelectedFile(file);
      setDocumentMessage('');
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentType || !selectedFile) {
      setDocumentMessage('Please select a document type and file');
      return;
    }

    setUploading(true);
    setDocumentMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDocumentMessage('Authentication required. Please log in again.');
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('documentType', documentType);

      const response = await axios.post('/api/user/documents/upload', uploadFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setDocumentMessage('Document uploaded successfully!');
      setDocumentType('');
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      console.error('Document upload error:', error);

      // Handle different error scenarios
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data || error.message;

        switch (status) {
          case 401:
            setDocumentMessage('Authentication failed. Please log in again.');
            // Clear token and redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
            break;
          case 403:
            setDocumentMessage('Access denied. Your account does not have permission to upload documents. Please contact support if you believe this is an error.');
            break;
          case 400:
            setDocumentMessage(message || 'Invalid request. Please check your file and try again.');
            break;
          case 413:
            setDocumentMessage('File too large. Please upload a file smaller than 10MB.');
            break;
          case 500:
            setDocumentMessage('Server error. Please try again later.');
            break;
          default:
            setDocumentMessage(`Upload failed (${status}): ${message}`);
        }
      } else if (error.request) {
        setDocumentMessage('Network error. Please check your internet connection and try again.');
      } else {
        setDocumentMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear any previous messages when user starts editing
    if (message) {
      setMessage('');
    }
  };

  const hasDocumentsUploaded = () => {
    return documents.length > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit called');
    setSubmitting(true);
    setMessage('');

    if (!hasDocumentsUploaded() && loans.length === 0) {
      console.log('Documents check failed - no documents uploaded and no previous loans');
      setMessage('Please upload at least one document before applying for loan.');
      setSubmitting(false);
      return;
    }
    console.log('Documents check passed');

    try {
      const token = localStorage.getItem('token');
      console.log('Token present:', !!token);
      // Convert termYears to term (months) for backend
      const requestData = {
        amount: formData.amount,
        term: formData.termYears * 12, // Convert years to months
        purpose: formData.purpose
      };
      console.log('Making API call with data:', requestData);
      await axios.post('/api/user/loans/apply', requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('API call successful');
      setMessage('Loan application submitted successfully!');
      setFormData({ amount: 1000000, termYears: 10, purpose: '', interestRate: 8.5 });

      // Clear document upload state
      setDocumentType('');
      setSelectedFile(null);
      setDocumentMessage('');

      // Wait a moment for backend processing, then refresh loan history and documents
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchLoans();
      await fetchDocuments();
    } catch (error) {
      console.error('Loan application error:', error);
      console.log('Error details:', error.response?.data, error.response?.status);
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data || 'Unknown error';
        if (status === 401) {
          setMessage('Authentication failed. Please log in again.');
          localStorage.removeItem('token');
          setTimeout(() => window.location.href = '/login', 2000);
        } else if (status === 400) {
          setMessage(`Invalid request: ${message}`);
        } else if (status === 403) {
          setMessage('You do not have permission to apply for loans.');
        } else {
          setMessage(`Failed to submit loan application: ${message}`);
        }
      } else if (error.request) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLoans = loans
    .filter(loan =>
      loan.id.toString().includes(searchTerm) ||
      loan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.appliedDate);
      const dateB = new Date(b.appliedDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const sortedDocuments = [...documents].sort((a, b) => {
    return sortOrder === 'desc' ? b.id - a.id : a.id - b.id;
  });

  // Documents are associated with loans when applications are submitted

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h2>
              <span className="header-icon" aria-hidden="true">🏦</span>
              User Dashboard
            </h2>
            <p>Welcome back, <strong>{user.username}</strong></p>
            <span className="user-id">User ID: {user.userId}</span>
          </div>
          <div className="header-stats">
            <div className="stat-card" role="region" aria-labelledby="loans-stat">
              <span className="stat-icon" aria-hidden="true">📊</span>
              <div className="stat-info">
                <span className="stat-number" id="loans-stat">{loans.length}</span>
                <span className="stat-label">Total Loans</span>
              </div>
            </div>
            <div className="stat-card" role="region" aria-labelledby="approved-stat">
              <span className="stat-icon" aria-hidden="true">✅</span>
              <div className="stat-info">
                <span className="stat-number" id="approved-stat">
                  {loans.filter(loan => loan.status === 'APPROVED').length}
                </span>
                <span className="stat-label">Approved</span>
              </div>
            </div>
            <div className="stat-card" role="region" aria-labelledby="pending-stat">
              <span className="stat-icon" aria-hidden="true">⏳</span>
              <div className="stat-info">
                <span className="stat-number" id="pending-stat">
                  {loans.filter(loan => loan.status === 'APPLIED' || loan.status === 'VERIFIED').length}
                </span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
            <div className="stat-card" role="region" aria-labelledby="credit-score-stat">
              <span className="stat-icon" aria-hidden="true">📈</span>
              <div className="stat-info">
                <span className="stat-number" id="credit-score-stat">
                  {loans.length > 0 ? Math.max(...loans.map(loan => loan.creditScore || 0)) || 'N/A' : 'N/A'}
                </span>
                <span className="stat-label">Credit Score</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Score Display Section */}
      {loans.length > 0 && (
        <div className="credit-score-display card">
          <h3>📊 Your Credit Profile</h3>
          <div className="credit-score-content">
            <div className="credit-score-main">
              <div className="credit-score-number">
                {(() => {
                  const latestScore = Math.max(...loans.map(loan => loan.creditScore || 0));
                  const category = latestScore >= 750 ? 'excellent' :
                                   latestScore >= 650 ? 'good' :
                                   latestScore >= 550 ? 'fair' : 'poor';
                  return (
                    <span className={`credit-score-large ${category}`}>
                      {latestScore || 'N/A'}
                    </span>
                  );
                })()}
              </div>
              <div className="credit-score-info">
                <h4>Credit Score</h4>
                <p>Your current credit score based on your loan history and profile</p>
                <div className="credit-score-breakdown">
                  <div className="score-range">
                    <span className="range-label">Poor</span>
                    <span className="range-value">300-549</span>
                  </div>
                  <div className="score-range">
                    <span className="range-label">Fair</span>
                    <span className="range-value">550-649</span>
                  </div>
                  <div className="score-range">
                    <span className="range-label">Good</span>
                    <span className="range-value">650-749</span>
                  </div>
                  <div className="score-range">
                    <span className="range-label">Excellent</span>
                    <span className="range-value">750-850</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="loan-application card">
        <h3>💰 Loan Application</h3>

        <IntegratedLoanCalculator
          formData={formData}
          onFormDataChange={setFormData}
        />

        {/* Document Upload Section - Always visible but show guidance when no purpose selected */}
        <div className="document-upload-section">
          <h4>📄 Document Upload</h4>

          {!formData.purpose && (
            <div className="document-guidance">
              <div className="guidance-message">
                💡 <strong>Please select a loan purpose above first</strong> to enable document upload.
              </div>
            </div>
          )}

          {formData.purpose && (
            <div className="document-form">
              <div className="form-group">
                <label htmlFor="documentType">Document Type:</label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="document-select"
                  disabled={uploading}
                >
                  <option value="">Select Document Type</option>
                  <option value="IDENTITY">Identity Proof (Aadhaar/PAN)</option>
                  <option value="INCOME">Income Proof (Salary Slip/IT Returns)</option>
                  <option value="ADDRESS">Address Proof (Utility Bill)</option>
                  <option value="BANK_STATEMENT">Bank Statement (Last 6 months)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="documentFile">Upload Document:</label>
                <input
                  type="file"
                  id="documentFile"
                  onChange={handleFileChange}
                  className="document-file-input"
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedFile && (
                  <div className="file-info">
                    📎 Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
                <small className="file-hint">Accepted formats: PDF, JPG, PNG (Max 10MB)</small>
              </div>
              <button
                onClick={handleDocumentUpload}
                disabled={uploading || !documentType || !selectedFile}
                className="upload-btn"
              >
                {uploading ? '📤 Uploading...' : '📤 Upload Document'}
              </button>
            </div>
          )}

          {documentMessage && (
            <div className={`message ${documentMessage.includes('success') ? 'success' : 'error'}`}>
              {documentMessage}
            </div>
          )}

          {/* Submit Button - Always visible but disabled if requirements not met */}
          <div className="loan-submit-section">
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.purpose || (!hasDocumentsUploaded() && loans.length === 0)}
              className="apply-btn"
            >
              {submitting ? 'Submitting...' : '📤 Apply for Loan'}
            </button>
            {!formData.purpose && (
              <p className="document-requirement">
                ⚠️ Please select a loan purpose above before applying for loan.
              </p>
            )}
            {formData.purpose && (!hasDocumentsUploaded() && loans.length === 0) && (
              <p className="document-requirement">
                ⚠️ Please upload at least one document before applying for loan.
              </p>
            )}
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="loan-history card">
        <div className="table-header">
          <div className="table-title">
            <h3>📊 Loan History</h3>
            <span className="record-count">{filteredLoans.length} records</span>
          </div>
          <div className="table-actions">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="sort-toggle-btn"
              title={`Currently ${sortOrder === 'desc' ? 'newest' : 'oldest'} first. Click to reverse order.`}
            >
              {sortOrder === 'desc' ? '⬇️ Newest First' : '⬆️ Oldest First'}
            </button>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
        



        {/* Progress Indicators for Active Applications */}
        {filteredLoans.some(loan => loan.status === 'APPLIED' || loan.status === 'VERIFIED') && (
          <div className="progress-indicators">
            <h4>📈 Application Progress</h4>
            {filteredLoans
              .filter(loan => loan.status === 'APPLIED' || loan.status === 'VERIFIED')
              .slice(0, 3)
              .map(loan => (
                <div key={loan.id} className="progress-item">
                  <div className="progress-header">
                    <span className="progress-title">Loan #{loan.id}</span>
                    <span className="progress-amount">₹{loan.amount?.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: loan.status === 'VERIFIED' ? '75%' : '25%'
                      }}
                    ></div>
                  </div>
                  <div className="progress-steps">
                    <span className={`step ${loan.status === 'APPLIED' || loan.status === 'VERIFIED' ? 'completed' : ''}`}>
                      📝 Applied
                    </span>
                    <span className={`step ${loan.status === 'VERIFIED' ? 'completed' : ''}`}>
                      ✅ Verified
                    </span>
                    <span className={`step ${loan.status === 'APPROVED' ? 'completed' : ''}`}>
                      🎉 Approved
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading loan applications...</span>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Term</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Credit Score</th>
                  <th>Approved Amount</th>
                  <th>Paid Amount</th>
                  <th>Pending Amount</th>
                  <th>Interest Rate (%)</th>
                  <th>EMI (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length > 0 ? (
                  filteredLoans.map(loan => (
                    <tr key={loan.id}>
                      <td>{loan.id}</td>
                      <td>₹{loan.amount?.toLocaleString()}</td>
                      <td>{loan.term} months</td>
                      <td>{loan.purpose}</td>
                      <td>
                        <span className={`status status-${loan.status?.toLowerCase()}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td>
                        <span className={`credit-score ${loan.creditScore >= 740 ? 'excellent' : loan.creditScore >= 670 ? 'good' : loan.creditScore >= 580 ? 'fair' : 'poor'}`}>
                          {loan.creditScore || 'N/A'}
                        </span>
                      </td>
                      <td>₹{loan.approvedAmount?.toLocaleString() || 0}</td>
                      <td>₹{loan.paidAmount?.toLocaleString() || 0}</td>
                      <td>₹{loan.pendingAmount?.toLocaleString() || 0}</td>
                      <td>{loan.interestRate ? `${loan.interestRate}%` : 'N/A'}</td>
                      <td>₹{calculateEMI(loan.approvedAmount || loan.amount, loan.interestRate, loan.term)?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="no-data">
                      {searchTerm ? 'No loans match your search.' : 'No loan applications found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>




      <div className="document-status card">
        <h3>📄 Document Status</h3>
        <div className="documents-list">
           <div className="table-header">
             <h4>Uploaded Documents</h4>
             <button
               onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
               className="sort-toggle-btn"
               title={`Currently ${sortOrder === 'desc' ? 'newest' : 'oldest'} first. Click to reverse order.`}
             >
               {sortOrder === 'desc' ? '⬇️ Newest First' : '⬆️ Oldest First'}
             </button>
           </div>
           {documents.some(doc => doc.status === 'REJECTED') && (
             <div className="document-warning">
               ⚠️ Some documents were rejected. Please upload new versions of rejected documents in the loan application section above.
             </div>
           )}
           {sortedDocuments.length > 0 ? (
             <div className="documents-table-container">
               <table className="documents-table">
                 <thead>
                   <tr>
                     <th>Loan ID</th>
                     <th>Type</th>
                     <th>File Name</th>
                     <th>Status</th>
                     <th>Size</th>
                   </tr>
                 </thead>
                 <tbody>
                   {sortedDocuments.map(doc => (
                     <tr key={doc.id} className={doc.status === 'REJECTED' ? 'rejected-row' : ''}>
                       <td>{doc.loanApplicationId || 'N/A'}</td>
                       <td>{doc.documentType}</td>
                       <td>{doc.fileName}</td>
                       <td>
                         <span className={`status status-${doc.status.toLowerCase()}`}>
                           {doc.status}
                         </span>
                       </td>
                       <td>{(doc.fileSize / 1024).toFixed(2)} KB</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           ) : (
             <p className="no-documents">No documents uploaded yet.</p>
           )}
         </div>
      </div>

    </div>
    
  );
}

export default UserDashboard;
