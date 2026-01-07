import React, { useState, useEffect } from 'react';
import api from '../api';

function PaymentMethodSelector({ selectedPaymentMethod, onSelect }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/payment_methods');
      const methods = response.data.paymentMethods || [];
      setPaymentMethods(methods);
      
      // Auto-select default if no payment method is selected
      if (!selectedPaymentMethod && onSelect) {
        const defaultMethod = methods.find(pm => pm.is_default);
        if (defaultMethod) {
          onSelect(defaultMethod.id);
        }
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    } finally {
      setLoading(false);
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
            } ${method.is_default ? 'default' : ''}`}
            onClick={() => onSelect && onSelect(method.id)}
          >
            <div className="payment-method-icon">{method.icon || '💳'}</div>
            <div className="payment-method-name">{method.name}</div>
            {method.is_default && (
              <div className="default-badge">Default</div>
            )}
            {selectedPaymentMethod === method.id && (
              <div className="selected-badge">✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PaymentMethodSelector;

