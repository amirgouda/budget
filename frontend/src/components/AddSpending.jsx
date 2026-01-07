import React, { useState, useEffect } from 'react';
import api from '../api';
import CategorySelector from './CategorySelector';
import SubcategorySelector from './SubcategorySelector';

function AddSpending({ categories, onAdd, onClose }) {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500, 1000];

  useEffect(() => {
    // Auto-select first category if available
    if (categories && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

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
        date,
      });

      onAdd(response.data.spending);
      // Reset form
      setAmount('');
      setSubcategoryId(null);
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
  };

  return (
    <div className="add-spending-overlay" onClick={onClose}>
      <div className="add-spending-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Spending</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="add-spending-form">
          {error && <div className="error-message">{error}</div>}

          <CategorySelector
            categories={categories}
            selectedCategory={categoryId}
            onSelect={setCategoryId}
            showBudget={true}
          />

          <SubcategorySelector
            categoryId={categoryId}
            selectedSubcategory={subcategoryId}
            onSelect={setSubcategoryId}
          />

          <div className="form-group">
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
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Spending'}
            </button>
            {onClose && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSpending;

