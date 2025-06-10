import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState({ fname: '', lname: '', mobile: '' });
  const [ordersUpdated, setOrdersUpdated] = useState(false);

  
  return (
    <UserContext.Provider value={{
      user,
      setUser,
      ordersUpdated,
      setOrdersUpdated,
    }}>
      {children}
    </UserContext.Provider>
  );
}