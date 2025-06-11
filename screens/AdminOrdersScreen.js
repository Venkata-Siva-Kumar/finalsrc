import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { API_BASE_URL } from '../config';
const Tab = createMaterialTopTabNavigator();

function OrdersTab({ orders, productMap, status, updateOrderStatus }) {
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
          <View style={styles.card}>
            <Text style={styles.orderId}>Order ID: {item.orderId}</Text>
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
            <Text style={{ fontWeight: 'bold', marginTop: 6 }}>Products:</Text>
            {item.items && item.items.length > 0 ? (
              item.items.map((prod, idx) => (
                <View key={idx} style={{ marginLeft: 10, marginBottom: 4 }}>
                  <Text>
                    • {prod.name || productMap[prod.productId || prod.id] || 'Unknown'} x {prod.quantity} @ ₹{prod.price}
                  </Text>
                </View>
              ))
            ) : (
              <Text>No products in this order.</Text>
            )}
            <Text style={{ fontWeight: 'bold', marginTop: 6 }}>Address:</Text>
                {item.deliveryAddress && typeof item.deliveryAddress === 'object' && !Array.isArray(item.deliveryAddress) ? (
                  <>
                    {item.deliveryAddress.name ? <Text style={styles.addressText}>Name: {item.deliveryAddress.name}</Text> : null}
                    {item.deliveryAddress.mobile ? <Text style={styles.addressText}>Mobile: {item.deliveryAddress.mobile}</Text> : null}
                    {/* If address is an object, display its fields line by line */}
                    {item.deliveryAddress.address && typeof item.deliveryAddress.address === 'object' && !Array.isArray(item.deliveryAddress.address) ? (
                      <>
                        {item.deliveryAddress.address.street ? <Text style={styles.addressText}>Street: {item.deliveryAddress.address.street}</Text> : null}
                        {item.deliveryAddress.address.area ? <Text style={styles.addressText}>Area: {item.deliveryAddress.address.area}</Text> : null}
                        {item.deliveryAddress.address.house ? <Text style={styles.addressText}>House: {item.deliveryAddress.address.house}</Text> : null}
                        {/* Add more fields as needed */}
                      </>
                    ) : (
                      item.deliveryAddress.address ? <Text style={styles.addressText}>Address: {item.deliveryAddress.address}</Text> : null
                    )}
                    {item.deliveryAddress.locality ? <Text style={styles.addressText}>Locality: {item.deliveryAddress.locality}</Text> : null}
                    {item.deliveryAddress.city ? <Text style={styles.addressText}>City: {item.deliveryAddress.city}</Text> : null}
                    {item.deliveryAddress.state ? <Text style={styles.addressText}>State: {item.deliveryAddress.state}</Text> : null}
                    {item.deliveryAddress.pincode ? <Text style={styles.addressText}>Pincode: {item.deliveryAddress.pincode}</Text> : null}
                    {item.deliveryAddress.landmark ? <Text style={styles.addressText}>Landmark: {item.deliveryAddress.landmark}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.addressText}>
                    {typeof item.deliveryAddress === 'string' ? item.deliveryAddress : 'N/A'}
                  </Text>
                )}
            {item.orderStatus === 'Pending' && (
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#28a745',
                  padding: 8,
                  borderRadius: 6,
                  flex: 1,
                  alignItems: 'center',
                  marginRight: 8,
                }}
                onPress={() => updateOrderStatus(item.orderId, 'Delivered')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark as Delivered</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#ff3b30',
                  padding: 8,
                  borderRadius: 6,
                  flex: 1,
                  alignItems: 'center',
                }}
                onPress={() => updateOrderStatus(item.orderId, 'Cancelled')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
      />
    </View>
  );
}

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productMap, setProductMap] = useState({});

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

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

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
      headerTitleStyle: { fontWeight: 'bold', fontSize: 30 },
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff9500" />
      </View>
    );
  }

  return (
    <Tab.Navigator>
      <Tab.Screen name="Order Pending">
        {() => <OrdersTab orders={orders} productMap={productMap} status="Pending" updateOrderStatus={updateOrderStatus} />}
      </Tab.Screen>
      <Tab.Screen name="Delivered">
        {() => <OrdersTab orders={orders} productMap={productMap} status="Delivered" updateOrderStatus={updateOrderStatus} />}
      </Tab.Screen>
       <Tab.Screen name="Cancelled">
      {() => <OrdersTab orders={orders} productMap={productMap} status="Cancelled" updateOrderStatus={updateOrderStatus} />}
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
  orderId: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  productItem: { fontSize: 14, color: '#333', marginLeft: 8, marginTop: 2 },
  addressText: { fontSize: 13, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});