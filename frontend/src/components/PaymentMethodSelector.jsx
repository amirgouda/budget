import React, { useState, useEffect } from 'react';
import api from '../api';

function PaymentMethodSelector({ selectedPaymentMethod, onSelect, showDefaultOption = true }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
    if (showDefaultOption) {
      loadDefaultPaymentMethod();
    }
  }, [showDefaultOption]);

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/payment_methods');
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPaymentMethod = async () => {
    try {
      const response = await api.get('/payment_methods/default');
      if (response.data.defaultPaymentMethod) {
        setDefaultPaymentMethod(response.data.defaultPaymentMethod);
        // Auto-select default if no payment method is selected
        if (!selectedPaymentMethod && onSelect) {
          onSelect(response.data.defaultPaymentMethod.id);
        }
      }
    } catch (err) {
      console.error('Failed to load default payment method:', err);
    }
  };

  const handleSetAsDefault = async (methodId) => {
    try {
      await api.put('/payment_methods/default', { paymentMethodId: methodId });
      setDefaultPaymentMethod(paymentMethods.find(pm => pm.id === methodId));
      alert('Default payment method updated!');
    } catch (err) {
      console.error('Failed to set default payment method:', err);
      alert('Failed to set default payment method');
    }
  };

  if (loading) {
    return <div className="form-group">Loading payment methods...</div>;
  }

  return (
    <div className="form-group">
      <label htmlFor="paymentMethod">Payment Method</label>
      <div className="payment-methods-grid">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-method-option ${
              selectedPaymentMethod === method.id ? 'selected' : ''
            } ${defaultPaymentMethod?.id === method.id ? 'default' : ''}`}
            onClick={() => onSelect && onSelect(method.id)}
          >
            <div className="payment-method-icon">{method.icon || '💳'}</div>
            <div className="payment-method-name">{method.name}</div>
            {defaultPaymentMethod?.id === method.id && (
              <div className="default-badge">Default</div>
            )}
            {selectedPaymentMethod === method.id && (
              <div className="selected-badge">✓</div>
            )}
          </div>
        ))}
      </div>
      {selectedPaymentMethod && (
        <div className="payment-method-actions">
          <button
            type="button"
            className="btn-link"
            onClick={() => handleSetAsDefault(selectedPaymentMethod)}
            disabled={defaultPaymentMethod?.id === selectedPaymentMethod}
          >
            {defaultPaymentMethod?.id === selectedPaymentMethod
              ? '✓ Set as default'
              : 'Set as default'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PaymentMethodSelector;

