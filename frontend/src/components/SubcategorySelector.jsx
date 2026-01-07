import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function SubcategorySelector({ categoryId, selectedSubcategory, onSelect, required = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSearchTerm('');
      setShowDropdown(false);
      return;
    }

    const searchSubcategories = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/subcategories?categoryId=${categoryId}&search=${encodeURIComponent(searchTerm)}`);
        setSubcategories(response.data.subcategories || []);
        // Keep dropdown open when searching
        if (searchTerm.trim().length > 0 || response.data.subcategories?.length > 0) {
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Failed to load subcategories:', err);
        setSubcategories([]);
        if (searchTerm.trim().length > 0) {
          setShowDropdown(true);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchSubcategories();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [categoryId, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if we're currently interacting
      if (isInteractingRef.current) {
        return;
      }

      const target = event.target;
      const isOutsideInput = inputRef.current && !inputRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideInput && isOutsideDropdown) {
        setShowDropdown(false);
      }
    };

    // Use longer delay for mobile
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
  };

  const handleSelect = (subcategory) => {
    setSearchTerm(subcategory.name);
    onSelect(subcategory.id);
    // Close after a delay
    setTimeout(() => {
      setShowDropdown(false);
    }, 100);
  };

  const handleCreateNew = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchTerm.trim() || !categoryId) return;

    setCreating(true);
    setShowDropdown(true);
    
    try {
      const response = await api.post('/subcategories', {
        name: searchTerm.trim(),
        categoryId: categoryId,
      });

      const newSubcategory = response.data.subcategory;
      setSubcategories([newSubcategory, ...subcategories]);
      setSearchTerm(newSubcategory.name);
      onSelect(newSubcategory.id);
      
      setTimeout(() => {
        setShowDropdown(false);
      }, 200);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create subcategory');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      if (subcategories.length > 0) {
        handleSelect(subcategories[0]);
      } else {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Get selected subcategory name for display
  useEffect(() => {
    if (selectedSubcategory && subcategories.length > 0) {
      const selected = subcategories.find(s => s.id === selectedSubcategory);
      if (selected) {
        setSearchTerm(selected.name);
      }
    } else if (!selectedSubcategory) {
      // Don't clear if dropdown is open and user is typing
      if (!showDropdown) {
        setSearchTerm('');
      }
    }
  }, [selectedSubcategory, subcategories]);

  // Handle focus - open dropdown
  const handleFocus = () => {
    isInteractingRef.current = false;
    setShowDropdown(true);
  };

  // Handle blur - but with protection for mobile
  const handleBlur = () => {
    // Set flag that we're interacting
    isInteractingRef.current = true;
    
    // Check after a delay if we should close
    setTimeout(() => {
      // Only close if focus didn't move to dropdown
      const activeElement = document.activeElement;
      const isInsideDropdown = dropdownRef.current?.contains(activeElement);
      
      if (!isInsideDropdown) {
        setShowDropdown(false);
      }
      isInteractingRef.current = false;
    }, 300);
  };

  if (!categoryId) {
    return (
      <div className="form-group">
        <label>Subcategory</label>
        <input
          type="text"
          placeholder="Select a category first"
          disabled
        />
      </div>
    );
  }

  const showCreateOption = searchTerm.trim() && 
    !subcategories.some(s => s.name.toLowerCase() === searchTerm.trim().toLowerCase()) &&
    subcategories.length < 20;

  return (
    <div className="form-group subcategory-selector">
      <label htmlFor="subcategory">Subcategory{required ? ' *' : ''}</label>
      <div className="subcategory-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          id="subcategory"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search or type to add new subcategory..."
          autoComplete="off"
        />
        {loading && <div className="loading-indicator">⏳</div>}
        
        {showDropdown && (
          <div 
            ref={dropdownRef} 
            className="subcategory-dropdown"
            onTouchStart={(e) => {
              // Mark that we're interacting
              isInteractingRef.current = true;
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Keep flag for a bit longer
              setTimeout(() => {
                isInteractingRef.current = false;
              }, 100);
            }}
            onMouseDown={(e) => {
              isInteractingRef.current = true;
              e.stopPropagation();
            }}
          >
            {loading && subcategories.length === 0 && (
              <div className="subcategory-option loading">Searching...</div>
            )}
            {!loading && subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                className={`subcategory-option ${selectedSubcategory === subcategory.id ? 'selected' : ''}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleSelect(subcategory);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(subcategory);
                }}
              >
                {subcategory.name}
              </div>
            ))}
            {showCreateOption && !loading && (
              <div
                className="subcategory-option create-new"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCreateNew(e);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNew(e);
                }}
              >
                {creating ? 'Creating...' : `+ Create "${searchTerm.trim()}"`}
              </div>
            )}
            {!showCreateOption && !loading && subcategories.length === 0 && searchTerm.trim().length > 0 && (
              <div className="subcategory-option no-results">
                No subcategories found. Tap below or press Enter to create.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubcategorySelector;
