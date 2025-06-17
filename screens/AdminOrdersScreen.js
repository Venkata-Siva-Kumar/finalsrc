import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { API_BASE_URL } from '../config';
import AppHeaderIcon from './AppHeaderIcon'; 
import * as Clipboard from 'expo-clipboard';

const Tab = createMaterialTopTabNavigator();

const tabNames = ['Order Pending', 'Delivered', 'Cancelled'];

function OrdersTab({ orders, productMap, status, updateOrderStatus, onOrderPress }) {
  const [search, setSearch] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  useEffect(() => {
    const filtered = orders.filter(order => order.orderStatus === status);
    setFilteredOrders(filtered);
  }, [orders, status]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOrders(orders.filter(order => order.orderStatus === status));
    } else {
      setFilteredOrders(
        orders.filter(
          order =>
            order.orderStatus === status &&
            order.orderId &&
            order.orderId.toString().toLowerCase().includes(search.trim().toLowerCase())
        )
      );
    }
  }, [search, orders, status]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={22} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder=" Search by Order ID"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          keyboardType="default"
        />
      </View>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item, index) => (item.orderId ? item.orderId.toString() : index.toString())}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.minCard}
            onPress={() => onOrderPress(item, status)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
              <Text style={styles.orderId}>Order ID: {item.orderId}</Text>
              {/* Add this icon to indicate navigation */}
              <Ionicons name="chevron-forward" size={22} color="#888" />
            </View>
            <Text>User: {item.userMobile}</Text>
            <Text>Total: ₹{item.totalAmount}</Text>
            <Text
              style={{
                color:
                  item.orderStatus === 'Pending'
                    ? '#ff9500'
                    : item.orderStatus === 'Delivered'
                    ? '#28a745'
                    : item.orderStatus === 'Cancelled'
                    ? '#ff3b30'
                    : '#333',
                fontWeight: 'bold',
              }}
            >
              Status: {item.orderStatus}
            </Text>
            <Text>
              Date: {item.orderDate ? new Date(item.orderDate).toLocaleString() : 'N/A'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
      />
    </View>
  );
}

export default function AdminOrdersScreen({ navigation, route }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productMap, setProductMap] = useState({});
  const [tabIndex, setTabIndex] = useState(0);

  // Update tabIndex if coming back from OrderDetailsScreen
  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.tabIndex !== undefined && typeof route.params.tabIndex === 'number') {
        setTabIndex(route.params.tabIndex);
      }
      fetchOrders();
    }, [route?.params?.tabIndex])
  );

  const fetchOrders = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE_URL}/orders`),
      axios.get(`${API_BASE_URL}/products`)
    ])
      .then(([ordersRes, productsRes]) => {
        setOrders(ordersRes.data);
        const map = {};
        productsRes.data.forEach(prod => {
          map[prod.id] = prod.name;
        });
        setProductMap(map);
      })
      .catch(() => Alert.alert('Error', 'Failed to load orders or products'))
      .finally(() => setLoading(false));
  };

  const updateOrderStatus = async (orderId, status = 'Delivered') => {
    try {
      Alert.alert(
        'Confirm',
        status === 'Delivered'
          ? 'Are you sure you want to mark this order as Delivered?'
          : 'Are you sure you want to cancel this order?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status });
              Alert.alert('Success', status === 'Delivered' ? 'Order marked as Delivered' : 'Order Cancelled');
              fetchOrders();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Orders',
    });
  }, [navigation]);

  const handleOrderPress = (item, status) => {
    const idx =
      status === 'Pending'
        ? 0
        : status === 'Delivered'
        ? 1
        : 2;
    setTabIndex(idx);
    navigation.navigate('OrderDetails', { order: item, productMap, tabIndex: idx });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff9500" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={tabNames[0]}
      screenOptions={{
        tabBarIndicatorStyle: { backgroundColor: '#ff9500' },
        tabBarActiveTintColor: '#ff9500',
        tabBarInactiveTintColor: '#333',
        tabBarLabelStyle: { fontWeight: 'bold' },
      }}
      tabBarPosition="top"
      screenListeners={{
        tabPress: (e) => {
          const idx = tabNames.indexOf(e.target.split('-')[0]);
          if (idx !== -1) setTabIndex(idx);
        }
      }}
    >
      <Tab.Screen name="Order Pending">
        {() => <OrdersTab orders={orders} productMap={productMap} status="Pending" updateOrderStatus={updateOrderStatus} onOrderPress={handleOrderPress} />}
      </Tab.Screen>
      <Tab.Screen name="Delivered">
        {() => <OrdersTab orders={orders} productMap={productMap} status="Delivered" updateOrderStatus={updateOrderStatus} onOrderPress={handleOrderPress} />}
      </Tab.Screen>
      <Tab.Screen name="Cancelled">
        {() => <OrdersTab orders={orders} productMap={productMap} status="Cancelled" updateOrderStatus={updateOrderStatus} onOrderPress={handleOrderPress} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef3f9', padding: 12 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    paddingHorizontal: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  minCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    // Only show minimal info
  },
  orderId: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  productItem: { fontSize: 14, color: '#333', marginLeft: 8, marginTop: 2 },
  addressText: { fontSize: 13, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});