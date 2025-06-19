// ✅ Flicker-Free CartContext.js for React Native HomeScreen
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { UserContext } from '../UserContext';
import axios from 'axios';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, _setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const { user } = useContext(UserContext);

  // ✅ Filter out products that are not enabled
  const filterCart = useCallback(async (cartToFilter) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/products`);
      const enabledProducts = res.data.filter((p) => p.status === 'enabled');
      const enabledProductIds = new Set(enabledProducts.map(p => p.id));
      return cartToFilter.filter(item => enabledProductIds.has(item.product_id));
    } catch (e) {
      return cartToFilter;
    }
  }, []);

  // ✅ Set full cart only on first load or reset
  const setCart = useCallback(async (newCart) => {
    const filtered = await filterCart(newCart);
    _setCart(filtered);
  }, [filterCart]);

  // ✅ Instant local cart update to avoid flicker
  const updateCartLocal = useCallback((updater) => {
    _setCart(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      return updated;
    });
  }, []);

  // ✅ On initial load only, control cartLoaded
  useEffect(() => {
    const loadInitialCart = async () => {
      if (!user?.id) {
        _setCart([]);
        setCartLoaded(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/cart?user_id=${user.id}`);
        const data = await res.json();
        const cleanCart = await filterCart(Array.isArray(data) ? data : []);
        _setCart(cleanCart);
      } catch {
        _setCart([]);
      } finally {
        setCartLoaded(true);
      }
    };

    loadInitialCart();
  }, [user?.id, filterCart]);

  return (
    <CartContext.Provider value={{ cart, setCart, updateCartLocal, cartLoaded }}>
      {children}
    </CartContext.Provider>
  );
}
