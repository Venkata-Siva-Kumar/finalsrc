import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useContext, useEffect, useState } from "react";
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
import AdminHomeScreen, { EarningsTab } from './screens/Admin_Home_Screen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminOrdersScreen from './screens/AdminOrdersScreen';
import OrdersScreen from './screens/OrdersScreen';
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import { UserProvider } from './UserContext';
import ContactCenterScreen  from "./screens/ContactCenterScreen";
import AppHeaderIcon from './screens/AppHeaderIcon';
import OrderDetailsScreen from './screens/OrderDetailsScreen';
import OrderDetailsUserScreen from './screens/OrderDetailsUserScreen';
import BannerTab from './screens/BannerTab'; // <-- Import your BannerTab
import AdminOfferScreen from './screens/AdminOfferScreen';  
import TermsScreen from './screens/TermsScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({route}) {
  const userMobile = route.params?.userMobile;
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Cart") {
            iconName = focused ? "cart" : "cart-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 5,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} initialParams={{ userMobile }}  options={{headerTitleAlign: 'center',headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },headerLeft: () => <AppHeaderIcon />,}} />
      <Tab.Screen name="Account" component={AccountScreen} initialParams={{ userMobile }}  options={{headerTitleAlign: 'center',headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },headerLeft: () => <AppHeaderIcon />,}}/>
      <Tab.Screen name="Cart"  component={CartScreen} options={{ tabBarBadge: cartCount > 0 ? cartCount : undefined ,headerTitleAlign: 'center',headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },headerLeft: () => <AppHeaderIcon />}}  initialParams={{ userMobile }}  />
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
          } else if (route.name === "Offers") {
            iconName = focused ? "pricetag" : "pricetag-outline";
          } else if (route.name === "Banner") {
            iconName = focused ? "image" : "image-outline";
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
        options={{ title: "Admin", headerTitleAlign: 'center',headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },headerLeft: () => <AppHeaderIcon />,}}
      />
      <Tab.Screen
        name="Offers"
        component={AdminOfferScreen}
        options={{ title: "Offers", headerTitleAlign: 'center', headerTitleStyle: { fontWeight: 'bold', fontSize: 25 }, tabBarLabel: "Offers", headerLeft: () => <AppHeaderIcon /> ,}}
      />
      <Tab.Screen
        name="Banner"
        component={BannerTab}
        options={{ title: "Banner", headerTitleAlign: 'center', headerTitleStyle: { fontWeight: 'bold', fontSize: 25 }, tabBarLabel: "Banner", headerLeft: () => <AppHeaderIcon /> ,}}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsTab}
        options={{ title: "Collections",headerTitleAlign: 'center',headerLeft: () => <AppHeaderIcon /> ,headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },}}
      />
      <Tab.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{ title: "Orders" ,headerLeft: () => <AppHeaderIcon />,headerTitleStyle: { fontWeight: 'bold', fontSize: 25 }, headerTitleAlign: 'center',}}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      const admin = await AsyncStorage.getItem('admin');
      const user = await AsyncStorage.getItem('user');
      if (isAdmin === 'true' && admin) {
        setInitialRoute('AdminMainTabs');
      } else if (user) {
        setInitialRoute('Main');
      } else {
        setInitialRoute('Login');
      }
    };
    checkLogin();
  }, []);

  if (initialRoute === null) return null; // or a splash screen

  return (
    <SafeAreaProvider>
      <UserProvider>
        <CartProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}  >
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true }}  />
              <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ headerShown: true }} />
              <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: true }} />
              <Stack.Screen name="Main" component={MainTabs}  options={{  }} />
              <Stack.Screen name="AdminMainTabs" component={AdminTabs} options={{ headerShown: false }} />
              <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true }}/>
              {/* <Stack.Screen name="OTPLogin" component={OTPLoginScreen} options={{ headerShown: true}} /> */}
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true}}/>
              <Stack.Screen name="Payment2" component={Payment} options={{ headerShown: true }} />
              <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ headerShown: true }} />
              <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true ,headerRight: () => <AppHeaderIcon />}} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true }} />  
              <Stack.Screen name="ContactCenter" component={ContactCenterScreen} options={{ headerShown: true, title: "Contact Center",}} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ headerShown: true, title: "Order Details" }} /> 
              <Stack.Screen name="OrderDetailsUser" component={OrderDetailsUserScreen} options={{ headerShown: true, title: "Order Details" }} />
              <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: true,title: 'Terms and Conditions' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}