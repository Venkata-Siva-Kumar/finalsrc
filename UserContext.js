import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ordersUpdated, setOrdersUpdated] = useState(false);
  const [userMobile, setUserMobile] = useState('');

  // Load user from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('user').then(storedUser => {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    });
  }, []);

  // Save user to AsyncStorage when user changes
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
      AsyncStorage.removeItem('user');
    }
  }, [user]);

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      userMobile,
      setUserMobile,
      ordersUpdated,
      setOrdersUpdated,
    }}>
      {children}
    </UserContext.Provider>
  );
}