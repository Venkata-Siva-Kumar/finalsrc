import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from '../UserContext';
import { API_BASE_URL } from '../config';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (!user?.id) {
      setCart([]);
      setCartLoaded(true);
      return;
    }
    setCartLoaded(false);
    fetch(`${API_BASE_URL}/cart?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setCart(Array.isArray(data) ? data : []);
        setCartLoaded(true);
      })
      .catch(() => {
        setCart([]);
        setCartLoaded(true);
      });
  }, [user?.id]);

  return (
    <CartContext.Provider value={{ cart, setCart, cartLoaded }}>
      {children}
    </CartContext.Provider>
  );
}