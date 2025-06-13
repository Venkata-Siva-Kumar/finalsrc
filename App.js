import React, { useContext, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import ProfileScreen from './screens/ProfileScreen';
import Payment from "./screens/Payment";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import CartScreen from "./screens/CartScreen";
import PaymentScreen from "./screens/PaymentScreen";
// import OTPLoginScreen from "./screens/OTPLoginScreen";
import AccountScreen from "./screens/AccountScreen";
import { CartProvider, CartContext } from "./screens/CartContext";
import AdminHomeScreen, { EarningsTab } from './screens/Admin_Home_Screen'; // <-- fixed import
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminOrdersScreen from './screens/AdminOrdersScreen';
import OrdersScreen from './screens/OrdersScreen';
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import { UserProvider } from './UserContext';
import ContactCenterScreen  from "./screens/ContactCenterScreen";
import AppHeaderIcon from './screens/AppHeaderIcon'; // Adjust the path if needed
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({route}) {
  const userMobile = route.params?.userMobile;
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;
  return (
    <Tab.Navigator options={{ headerRight: () => <AppHeaderIcon /> }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Cart") {
            iconName = focused ? "cart" : "cart-outline";
          }else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline"; // <-- Add this block
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} initialParams={{ userMobile }} options={{ headerRight: () => <AppHeaderIcon />, }} />
      <Tab.Screen name="Account" component={AccountScreen} initialParams={{ userMobile }} options={{ headerRight: () => <AppHeaderIcon />, }}/>
      <Tab.Screen name="Cart"  component={CartScreen} options={{ tabBarBadge: cartCount > 0 ? cartCount : undefined , headerRight: () => <AppHeaderIcon />}}  initialParams={{ userMobile }}  />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "AdminHome") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Earnings") {
            iconName = focused ? "cash" : "cash-outline";
          } else if (route.name === "AdminOrders") {
            iconName = focused ? "list" : "list-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#ff9500",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsTab}
        options={{ title: "Earnings",headerRight: () => <AppHeaderIcon /> }}
      />
      <Tab.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{ title: "Orders",headerRight: () => <AppHeaderIcon /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <UserProvider>
      <CartProvider>
        <NavigationContainer >
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}  >
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}}  />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />
            <Stack.Screen name="Main" component={MainTabs}  options={{ headerRight: () => <AppHeaderIcon />, }} />
            <Stack.Screen name="AdminMainTabs" component={AdminTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}}/>
            {/* <Stack.Screen name="OTPLogin" component={OTPLoginScreen} options={{ headerShown: true}} /> */}
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true,headerRight: () => <AppHeaderIcon />}}/>
            <Stack.Screen name="Payment2" component={Payment} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />
            <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />  
            <Stack.Screen name="ContactCenter" component={ContactCenterScreen} options={{ headerShown: true, title: "Contact Center",headerRight: () => <AppHeaderIcon /> }} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </UserProvider>
  );
}