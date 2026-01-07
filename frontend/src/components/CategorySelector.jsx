import React from 'react';

function CategorySelector({ categories, selectedCategory, onSelect, showBudget = false }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="category-selector-empty">
        <p>No categories available. Admin needs to create categories first.</p>
      </div>
    );
  }

  return (
    <div className="category-selector">
      <label>Category</label>
      <div className="category-grid">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const remaining = category.monthly_budget
            ? parseFloat(category.monthly_budget) - (category.total_spent || 0)
            : null;
          const isOverBudget = remaining !== null && remaining < 0;

          return (
            <button
              key={category.id}
              type="button"
              className={`category-card ${isSelected ? 'selected' : ''} ${isOverBudget ? 'over-budget' : ''}`}
              onClick={() => onSelect(category.id)}
            >
              <div className="category-name">{category.name}</div>
              {showBudget && category.monthly_budget && (
                <div className="category-budget">
                  <span className="budget-amount">
                    {remaining !== null
                      ? `${remaining >= 0 ? '✓' : '⚠'} ${Math.abs(remaining).toFixed(2)} EGP`
                      : `${category.monthly_budget} EGP`}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategorySelector;

