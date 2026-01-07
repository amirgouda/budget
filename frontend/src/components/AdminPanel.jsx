import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function AdminPanel({ user, onLogout }) {
  const handleLogoutClick = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      onLogout();
    }
  };
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, membersRes] = await Promise.all([
        api.get('/categories'),
        api.get('/members'),
      ]);

      setCategories(categoriesRes.data.categories || []);
      setMembers(membersRes.data.members || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      monthlyBudget: parseFloat(formData.get('monthlyBudget') || 0),
    };

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, data);
      } else {
        await api.post('/categories', data);
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      username: formData.get('username'),
      password: formData.get('password'),
      role: formData.get('role'),
    };

    try {
      if (editingMember) {
        await api.put(`/members/${editingMember.id}`, data);
      } else {
        await api.post('/members', data);
      }
      setShowMemberForm(false);
      setEditingMember(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save member');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await api.delete(`/categories/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      await api.delete(`/members/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete member');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>⚙️ Admin Panel</h1>
          <div className="header-actions">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => navigate('/')}
            >
              Dashboard
            </button>
            <button className="btn btn-secondary btn-small" onClick={handleLogoutClick}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-tabs">
          <button
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button
            className={`tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Spending Categories</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryForm(true);
                }}
              >
                + Add Category
              </button>
            </div>

            {showCategoryForm && (
              <div className="modal-overlay" onClick={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                    <button
                      className="close-btn"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleCategorySubmit} className="admin-form">
                    <div className="form-group">
                      <label>Category Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingCategory?.name || ''}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Monthly Budget (EGP)</label>
                      <input
                        type="number"
                        name="monthlyBudget"
                        step="0.01"
                        min="0"
                        defaultValue={editingCategory?.monthly_budget || 0}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowCategoryForm(false);
                          setEditingCategory(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="admin-list">
              {categories.map((category) => (
                <div key={category.id} className="admin-item">
                  <div className="admin-item-content">
                    <h3>{category.name}</h3>
                    <p>Budget: {parseFloat(category.monthly_budget).toFixed(2)} EGP/month</p>
                  </div>
                  <div className="admin-item-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setEditingCategory(category);
                        setShowCategoryForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Family Members</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingMember(null);
                  setShowMemberForm(true);
                }}
              >
                + Add Member
              </button>
            </div>

            {showMemberForm && (
              <div className="modal-overlay" onClick={() => {
                setShowMemberForm(false);
                setEditingMember(null);
              }}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{editingMember ? 'Edit Member' : 'New Member'}</h3>
                    <button
                      className="close-btn"
                      onClick={() => {
                        setShowMemberForm(false);
                        setEditingMember(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleMemberSubmit} className="admin-form">
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        name="username"
                        defaultValue={editingMember?.username || ''}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password{editingMember ? ' (leave blank to keep current)' : ''}</label>
                      <input
                        type="password"
                        name="password"
                        required={!editingMember}
                      />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select name="role" defaultValue={editingMember?.role || 'member'}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowMemberForm(false);
                          setEditingMember(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="admin-list">
              {members.map((member) => (
                <div key={member.id} className="admin-item">
                  <div className="admin-item-content">
                    <h3>{member.username}</h3>
                    <p>Role: {member.role}</p>
                  </div>
                  <div className="admin-item-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setEditingMember(member);
                        setShowMemberForm(true);
                      }}
                    >
                      Edit
                    </button>
                    {member.id !== user.id && (
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteMember(member.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPanel;

