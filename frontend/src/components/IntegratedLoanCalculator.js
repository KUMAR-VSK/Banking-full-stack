import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function IntegratedLoanCalculator({ formData, onFormDataChange }) {
  const [emi, setEmi] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [interestRates, setInterestRates] = useState({});

  // Fetch interest rates from backend
  useEffect(() => {
    const fetchInterestRates = async () => {
      // Default rates
      const defaultRates = {
        'Home Purchase': 8.5,
        'Car Purchase': 9.5,
        'Education': 7.5,
        'Business': 10.5,
        'Personal': 12.0,
        'Health': 8.0,
        'Travel': 11.0,
        'Wedding': 9.0,
        'Home Renovation': 8.75,
        'Debt Consolidation': 11.5
      };

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/manager/interest-rates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Start with default rates
        const ratesObject = { ...defaultRates };
        // Update with fetched rates
        response.data.forEach(rate => {
          // Convert purpose to match frontend format (e.g., 'home purchase' -> 'Home Purchase')
          const displayPurpose = rate.purpose.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          ratesObject[displayPurpose] = parseFloat(rate.rate);
        });
        setInterestRates(ratesObject);
      } catch (error) {
        console.error('Error fetching interest rates:', error);
        // Fallback to default rates if fetch fails
        setInterestRates(defaultRates);
      }
    };

    fetchInterestRates();
  }, []);

  useEffect(() => {
    // Auto-set interest rate based on selected purpose
    if (formData.purpose && interestRates[formData.purpose] !== undefined) {
      const purposeRate = interestRates[formData.purpose];
      if (formData.interestRate !== purposeRate) {
        onFormDataChange({
          ...formData,
          interestRate: purposeRate
        });
        return; // Don't calculate yet, wait for state update
      }
    }
    calculateLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.amount, formData.interestRate, formData.termYears, formData.purpose]);

  const calculateLoan = () => {
    const principal = parseFloat(formData.amount) || 0;
    const annualRate = parseFloat(formData.interestRate) || 0;
    const tenureYears = parseFloat(formData.termYears) || 0;

    if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !tenureYears || tenureYears <= 0) {
      setEmi(0);
      setTotalPayment(0);
      setTotalInterest(0);
      return;
    }

    const tenureMonths = tenureYears * 12;
    const monthlyRate = annualRate / 12 / 100;

    // Prevent division by zero
    if (monthlyRate === 0) {
      const calculatedEmi = principal / tenureMonths;
      setEmi(Math.round(calculatedEmi));
      setTotalPayment(Math.round(principal));
      setTotalInterest(0);
      return;
    }

    const powResult = Math.pow(1 + monthlyRate, tenureMonths);
    if (!isFinite(powResult) || powResult <= 0) {
      setEmi(0);
      setTotalPayment(0);
      setTotalInterest(0);
      return;
    }

    const calculatedEmi = (principal * monthlyRate * powResult) / (powResult - 1);

    if (!isFinite(calculatedEmi) || calculatedEmi <= 0) {
      setEmi(0);
      setTotalPayment(0);
      setTotalInterest(0);
      return;
    }

    const calculatedTotalPayment = calculatedEmi * tenureMonths;
    const calculatedTotalInterest = calculatedTotalPayment - principal;

    setEmi(Math.round(calculatedEmi));
    setTotalPayment(Math.round(calculatedTotalPayment));
    setTotalInterest(Math.round(Math.max(0, calculatedTotalInterest)));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'amount') {
      const numValue = parseFloat(value) || 0;
      processedValue = Math.max(0, Math.min(numValue, 100000000)); // Cap at 10Cr
    } else if (name === 'termYears') {
      const numValue = parseFloat(value) || 0;
      processedValue = Math.max(1, Math.min(numValue, 30)); // Between 1-30 years
    }
    
    onFormDataChange({
      ...formData,
      [name]: name === 'amount' || name === 'termYears' ? processedValue : value
    });
  };

  const handleSliderChange = (name, value) => {
    onFormDataChange({
      ...formData,
      [name]: value
    });
  };

  const chartData = {
    labels: ['Principal Amount', 'Total Interest'],
    datasets: [{
      data: [formData.amount, totalInterest],
      backgroundColor: ['#667eea', '#f093fb'],
      borderColor: ['#5a67d8', '#e02596'],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `₹${context.parsed.toLocaleString()}`;
          }
        }
      }
    },
  };

  return (
    <div className="integrated-loan-calculator">
      {/* Step 1: Loan Purpose Selection */}
      <div className="loan-purpose-section">
        <div className="purpose-header">
          <h4>🎯 Step 1: Select Loan Purpose</h4>
          <p>Choose your loan purpose to get personalized interest rates</p>
        </div>
        <div className="purpose-selector">
                      <label>Loan Purpose</label>
          <div className="form-group">
            {/* <label>Loan Purpose</label> */}
            <select
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              className="purpose-select"
            >
              <option value="">Select Purpose</option>
              {Object.entries(interestRates).map(([purpose, rate]) => (
                <option key={purpose} value={purpose}>
                  {purpose} - {rate}% p.a.
                </option>
              ))}
            </select>
          </div>
          {formData.purpose && (
            <div className="selected-purpose-display">
              <div className="purpose-icon-large">
                {formData.purpose === 'Home Purchase' && '🏠'}
                {formData.purpose === 'Car Purchase' && '🚗'}
                {formData.purpose === 'Education' && '🎓'}
                {formData.purpose === 'Business' && '💼'}
                {formData.purpose === 'Personal' && '💰'}
                {formData.purpose === 'Health' && '🏥'}
                {formData.purpose === 'Travel' && '✈️'}
                {formData.purpose === 'Wedding' && '💒'}
                {formData.purpose === 'Home Renovation' && '🔨'}
                {formData.purpose === 'Debt Consolidation' && '📊'}
              </div>
              <div className="purpose-info">
                <div className="purpose-name-large">{formData.purpose}</div>
                <div className="purpose-rate-large">{interestRates[formData.purpose]}% per annum</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Amount and Tenure (only show after purpose is selected) */}
      {formData.purpose && (
        <>
          <div className="calculator-layout">
            <div className="calculator-controls">
              <div className="step-header">
                <h4>💵 Step 2: Customize Your Loan</h4>
                <div className="selected-purpose">
                  <span className="purpose-label">Purpose:</span>
                  <span className="purpose-value">{formData.purpose}</span>
                  <span className="rate-display">({interestRates[formData.purpose]}% p.a.)</span>
                </div>
              </div>

              <div className="slider-control">
                <div className="slider-header">
                  <span>Loan Amount (₹)</span>
                  <span className="slider-value">₹{formData.amount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="10000000"
                  step="50000"
                  value={Math.min(formData.amount, 10000000)}
                  onChange={(e) => handleSliderChange('amount', parseFloat(e.target.value))}
                  className="calculator-slider"
                  disabled={formData.amount > 10000000}
                />
                <div className="slider-range">
                  <span>₹1L</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    min="100000"
                    step="50000"
                    className="slider-input"
                    placeholder="Enter amount"
                  />
                  <span>₹1Cr+</span>
                </div>
                {formData.amount > 10000000 && (
                  <div className="slider-note">
                    💡 Amount exceeds slider range - use input field for higher values
                  </div>
                )}
              </div>

              <div className="slider-control">
                <div className="slider-header">
                  <span>Loan Term (Years)</span>
                  <span className="slider-value">{formData.termYears} years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={formData.termYears}
                  onChange={(e) => handleSliderChange('termYears', parseFloat(e.target.value))}
                  className="calculator-slider"
                />
                <div className="slider-range">
                  <span>1 year</span>
                  <input
                    type="number"
                    name="termYears"
                    value={formData.termYears}
                    onChange={handleInputChange}
                    min="1"
                    max="30"
                    step="1"
                    className="slider-input"
                  />
                  <span>30 years</span>
                </div>
              </div>

              <div className="interest-display">
                <label>Interest Rate (Auto-set based on purpose)</label>
                <div className="interest-value">
                  <span className="rate-number">{formData.interestRate}%</span>
                  <span className="rate-label">per annum</span>
                </div>
                <div className="interest-note">
                  📊 Rate automatically adjusted based on your selected loan purpose
                </div>
              </div>
            </div>

            <div className="calculator-visualization">
              <div className="emi-display">
                <div className="emi-item">
                  <div className="emi-label">Monthly EMI</div>
                  <div className="emi-value">₹{emi.toLocaleString()}</div>
                </div>
                <div className="emi-item">
                  <div className="emi-label">Total Payment</div>
                  <div className="emi-value">₹{totalPayment.toLocaleString()}</div>
                </div>
                <div className="emi-item">
                  <div className="emi-label">Total Interest</div>
                  <div className="emi-value">₹{totalInterest.toLocaleString()}</div>
                </div>
              </div>

              <div className="donut-chart-container">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="emi-summary">
            <div className="summary-row">
              <span>Principal Amount:</span>
              <span>₹{formData.amount.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Interest Rate:</span>
              <span>{formData.interestRate}% p.a.</span>
            </div>
            <div className="summary-row">
              <span>Loan Term:</span>
              <span>{formData.termYears} years</span>
            </div>
            <div className="summary-row">
              <span>Total Interest:</span>
              <span>₹{totalInterest.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount Payable:</span>
              <span>₹{totalPayment.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default IntegratedLoanCalculator;