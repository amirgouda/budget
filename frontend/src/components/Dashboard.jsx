import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AddSpending from './AddSpending';

function Dashboard({ user, onLogout }) {
  const handleLogoutClick = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      onLogout();
    }
  };
  const [spendings, setSpendings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSpending, setShowAddSpending] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [spendingsRes, categoriesRes, statsRes] = await Promise.all([
        api.get('/spendings?limit=50'),
        api.get('/categories'),
        api.get('/spendings/stats'),
      ]);

      setSpendings(spendingsRes.data.spendings || []);
      setCategories(categoriesRes.data.categories || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpending = (newSpending) => {
    setSpendings([newSpending, ...spendings]);
    loadData(); // Reload stats
  };

  const handleDeleteSpending = async (id) => {
    if (!window.confirm('Are you sure you want to delete this spending?')) {
      return;
    }

    try {
      await api.delete(`/spendings/${id}`);
      setSpendings(spendings.filter((s) => s.id !== id));
      loadData(); // Reload stats
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete spending');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toFixed(2)} EGP`;
  };

  const calculateDailySpendingHealth = (monthlyBudget, totalSpent) => {
    if (!monthlyBudget || monthlyBudget <= 0) {
      return null;
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    const daysPassed = Math.max(1, now.getDate()); // At least 1 day has passed

    const expectedDaily = monthlyBudget / totalDaysInMonth;
    const actualDaily = totalSpent / daysPassed;
    const ratio = expectedDaily > 0 ? (actualDaily / expectedDaily) * 100 : 0;

    return {
      expectedDaily,
      actualDaily,
      ratio,
      daysPassed,
      totalDaysInMonth,
    };
  };

  const getHealthStatus = (ratio) => {
    if (ratio <= 80) return { status: 'healthy', color: 'var(--success-color)', icon: '✅' };
    if (ratio <= 100) return { status: 'on-track', color: 'var(--primary-color)', icon: '⚠️' };
    if (ratio <= 120) return { status: 'warning', color: 'var(--warning-color)', icon: '⚠️' };
    return { status: 'critical', color: 'var(--danger-color)', icon: '🚨' };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>💰 Family Budget</h1>
          <div className="header-actions">
            {user.role === 'admin' && (
              <button
                className="btn btn-secondary btn-small"
                onClick={() => navigate('/admin')}
              >
                Admin
              </button>
            )}
            <button className="btn btn-secondary btn-small" onClick={handleLogoutClick}>
              Logout
            </button>
          </div>
        </div>
        <div className="user-info">
          <p>Welcome, <strong>{user.username}</strong></p>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Budget Overview */}
        {stats && stats.categories && stats.categories.length > 0 && (
          <section className="budget-overview">
            <h2>Budget Overview</h2>
            <div className="budget-cards">
              {stats.categories.map((cat) => {
                const remaining = parseFloat(cat.remaining || 0);
                const spent = parseFloat(cat.total_spent || 0);
                const budget = parseFloat(cat.monthly_budget || 0);
                const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                const dailyHealth = calculateDailySpendingHealth(budget, spent);
                const healthStatus = dailyHealth ? getHealthStatus(dailyHealth.ratio) : null;

                return (
                  <div
                    key={cat.id}
                    className={`budget-card ${remaining < 0 ? 'over-budget' : ''}`}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setShowAddSpending(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="budget-card-header">
                      <h3>{cat.name}</h3>
                      <span className="budget-amount">{formatCurrency(budget)}</span>
                    </div>
                    <div className="budget-progress">
                      <div
                        className="budget-progress-bar"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="budget-details">
                      <span className="spent">Spent: {formatCurrency(spent)}</span>
                      <span className={`remaining ${remaining < 0 ? 'negative' : ''}`}>
                        {remaining >= 0 ? 'Remaining' : 'Over by'}:{' '}
                        {formatCurrency(Math.abs(remaining))}
                      </span>
                    </div>
                    {dailyHealth && healthStatus && (
                      <div className="daily-spending-insight">
                        <div className="insight-ratio" style={{ color: healthStatus.color }}>
                          <span className="insight-icon">{healthStatus.icon}</span>
                          <strong>{dailyHealth.ratio.toFixed(1)}%</strong> of expected rate
                          <span className="insight-days">
                            ({dailyHealth.daysPassed}/{dailyHealth.totalDaysInMonth} days)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="total-spending">
              <strong>Total Spent This Month: {formatCurrency(stats.total || 0)}</strong>
            </div>
          </section>
        )}

        {/* Recent Spendings */}
        <section className="spendings-section">
          <div className="section-header">
            <h2>Recent Spendings</h2>
          </div>

          {spendings.length === 0 ? (
            <div className="empty-state">
              <p>No spendings yet. Add your first spending!</p>
            </div>
          ) : (
            <div className="spendings-list">
              {spendings.map((spending) => (
                <div key={spending.id} className="spending-item">
                    <div className="spending-main">
                    <div className="spending-info">
                      <h3>
                        {spending.category_name}
                        {spending.payment_method_icon && (
                          <span className="spending-payment-method">
                            <span className="spending-payment-method-icon">
                              {spending.payment_method_icon}
                            </span>
                            {spending.payment_method_name && (
                              <span>{spending.payment_method_name}</span>
                            )}
                          </span>
                        )}
                      </h3>
                      {spending.subcategory_name && (
                        <p className="spending-subcategory">{spending.subcategory_name}</p>
                      )}
                      <span className="spending-date">{formatDate(spending.date)}</span>
                      <span className="spending-user">by {spending.user_name}</span>
                    </div>
                    <div className="spending-amount">
                      {formatCurrency(spending.amount)}
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteSpending(spending.id)}
                    aria-label="Delete spending"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showAddSpending && (
        <AddSpending
          categories={categories}
          onAdd={handleAddSpending}
          onClose={() => {
            setShowAddSpending(false);
            setSelectedCategoryId(null);
          }}
          initialCategoryId={selectedCategoryId}
        />
      )}
    </div>
  );
}

export default Dashboard;

