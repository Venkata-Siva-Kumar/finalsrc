import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState({ fname: '', lname: '', mobile: '' });
  const [ordersUpdated, setOrdersUpdated] = useState(false);
  const [userMobile, setUserMobile] = useState('');
  
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