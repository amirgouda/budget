import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import SubcategorySelector from './SubcategorySelector';

function AddSpending({ categories, onAdd, onClose, initialCategoryId }) {
  const [categoryId, setCategoryId] = useState(initialCategoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const amountInputRef = useRef(null);
  const subcategoryInputRef = useRef(null);

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500, 1000];

  // Get category name
  const category = categories?.find(cat => cat.id === categoryId);
  const categoryName = category?.name || '';

  // Get selected payment method
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
  const paymentMethodIcon = selectedPaymentMethod?.icon || '💳';

  // Format date for display
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    // Require categoryId
    if (!initialCategoryId) {
      if (onClose) onClose();
      return;
    }
    setCategoryId(initialCategoryId);
  }, [initialCategoryId, onClose]);

  useEffect(() => {
    // Load payment methods and auto-select default
    const loadPaymentMethods = async () => {
      try {
        const response = await api.get('/payment_methods');
        const methods = response.data.paymentMethods || [];
        setPaymentMethods(methods);
        
        // Auto-select default payment method
        const defaultMethod = methods.find(pm => pm.is_default);
        if (defaultMethod) {
          setPaymentMethodId(defaultMethod.id);
        }
      } catch (err) {
        console.error('Failed to load payment methods:', err);
      }
    };
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    // Auto-focus amount input on mount
    if (amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, []);

  useEffect(() => {
    // Reset subcategory when category changes
    setSubcategoryId(null);
  }, [categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/spendings', {
        categoryId,
        amount: parseFloat(amount),
        subcategoryId: subcategoryId || null,
        paymentMethodId: paymentMethodId || null,
        date,
      });

      onAdd(response.data.spending);
      // Reset form
      setAmount('');
      setSubcategoryId(null);
      setPaymentMethodId(null);
      setDate(new Date().toISOString().split('T')[0]);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add spending');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (quickAmount) => {
    setAmount(quickAmount.toString());
    // Keep focus on amount input
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  };

  const handleAmountBlur = () => {
    // Auto-focus subcategory after amount is entered
    if (amount && parseFloat(amount) > 0 && subcategoryInputRef.current) {
      setTimeout(() => {
        subcategoryInputRef.current?.focus();
      }, 100);
    }
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setShowDatePicker(false);
  };

  if (!categoryId) {
    return null;
  }

  return (
    <div className="add-spending-overlay" onClick={onClose}>
      <div className="add-spending-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="category-header-display">
            <span className="category-name">{categoryName}</span>
          </div>
          <div className="header-actions-right">
            <button
              type="button"
              className="date-button-header"
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(!showDatePicker);
              }}
            >
              {formatDateDisplay(date)}
            </button>
            {onClose && (
              <button className="close-btn" onClick={onClose} aria-label="Close">
                ×
              </button>
            )}
          </div>
        </div>

        {showDatePicker && (
          <div className="date-picker-overlay" onClick={() => setShowDatePicker(false)}>
            <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="date-picker-header">
                <h3>Select Date</h3>
                <button onClick={() => setShowDatePicker(false)}>×</button>
              </div>
              <div className="date-picker-body">
                <input
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  className="date-picker-input"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {showPaymentPicker && (
          <div className="payment-picker-overlay" onClick={() => setShowPaymentPicker(false)}>
            <div className="payment-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="payment-picker-header">
                <h3>Select Payment Method</h3>
                <button onClick={() => setShowPaymentPicker(false)}>×</button>
              </div>
              <div className="payment-methods-grid">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`payment-method-option ${
                      paymentMethodId === method.id ? 'selected' : ''
                    } ${method.is_default ? 'default' : ''}`}
                    onClick={() => {
                      setPaymentMethodId(method.id);
                      setShowPaymentPicker(false);
                    }}
                  >
                    <div className="payment-method-icon">{method.icon || '💳'}</div>
                    <div className="payment-method-name">{method.name}</div>
                    {method.is_default && (
                      <div className="default-badge">Default</div>
                    )}
                    {paymentMethodId === method.id && (
                      <div className="selected-badge">✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-spending-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group amount-group">
            <label htmlFor="amount">Amount (EGP)</label>
            <div className="quick-amounts">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => handleQuickAmount(quickAmount)}
                >
                  {quickAmount}
                </button>
              ))}
            </div>
            <div className="amount-input-wrapper">
              <input
                ref={amountInputRef}
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={handleAmountBlur}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
                className="amount-input"
              />
              <button
                type="button"
                className="payment-method-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPaymentPicker(true);
                }}
                aria-label="Change payment method"
              >
                {paymentMethodIcon}
              </button>
            </div>
          </div>

          <div className="form-group subcategory-group">
            <SubcategorySelector
              categoryId={categoryId}
              selectedSubcategory={subcategoryId}
              onSelect={setSubcategoryId}
              inputRef={subcategoryInputRef}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large btn-submit-fixed"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'ADD SPENDING'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSpending;
