import React, { useEffect, useState, useContext, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { UserContext } from '../UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config'; 

export default function OrdersScreen({ route, navigation }) {
  const { user } = useContext(UserContext);
  const userId = route.params?.userId || user?.id;
  const userMobile = route.params?.userMobile || user?.mobile;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Set refresh button in the navigation bar
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setRefreshKey(Date.now())} style={{ marginRight: 16 }}>
          <Ionicons name="refresh" size={24} color="#007aff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch orders when screen is focused or refreshKey changes
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      let url = '';
      if (userId) {
        url = `${API_BASE_URL}/orders?user_id=${userId}`;
      } else if (userMobile) {
        url = `${API_BASE_URL}/orders?mobile=${userMobile}`;
      } else {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }
      fetch(url)
        .then(res => res.json())
        .then(data => {
          const safeData = Array.isArray(data)
            ? data.map(order => ({
                ...order,
                items: Array.isArray(order.items) ? order.items : [],
              }))
            : [];
          setOrders(safeData);
          setFilteredOrders(safeData);
        })
        .catch(() => {
          setOrders([]);
          setFilteredOrders([]);
        })
        .finally(() => setLoading(false));
    }, [userId, userMobile, route.params?.refresh, refreshKey])
  );

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter(order =>
          order.orderId && order.orderId.toString().toLowerCase().includes(search.trim().toLowerCase())
        )
      );
    }
  }, [search, orders]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={22} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search by Order ID"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          keyboardType="default"
        />
      </View>
      <FlatList
        data={[...filteredOrders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))}
        keyExtractor={item => item.orderId?.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text style={{ fontWeight: 'bold' }}>Order ID: {item.orderId}</Text>
            <Text> Date: {item.orderDate ? new Date(item.orderDate).toLocaleDateString() : 'N/A'} </Text>
            <Text
              style={{
                color:
                  item.orderStatus === 'Delivered'
                    ? 'green'
                    : item.orderStatus === 'Pending'
                    ? 'orange'
                    : item.orderStatus === 'Cancelled'
                    ? 'red'
                    : '#333',
                fontWeight: 'bold',
              }}
            >
              Status: {item.orderStatus}
            </Text>
            <Text style={{ fontWeight: 'bold' }}>Total : ₹{item.totalAmount}</Text>
            {Array.isArray(item.items) && item.items.length > 0 && (
              <>
                <Text style={{ marginTop: 8, fontWeight: 'bold' }}>Products:</Text>
                {item.items.map((prod, idx) => (
                  <View key={idx} style={{ marginLeft: 10, marginBottom: 4 }}>
                    <Text>
                      {prod.name} ({prod.quantity_value}) x {prod.quantity} --- @ ₹{prod.price * prod.quantity}
                    </Text>
                  </View>
                ))}
              </>
            )}
            <Text style={{ marginTop: 8, fontWeight: 'bold' }}>Delivery Address:</Text>
            {item.deliveryAddress && typeof item.deliveryAddress === 'object' && !Array.isArray(item.deliveryAddress) ? (
  <>
    <Text>
      {item.deliveryAddress.address && typeof item.deliveryAddress.address === 'object'
        ? [
            item.deliveryAddress.address.house,
            item.deliveryAddress.address.street,
            item.deliveryAddress.address.area,
            item.deliveryAddress.locality,
            item.deliveryAddress.city,
            item.deliveryAddress.state,
            item.deliveryAddress.pincode,
            item.deliveryAddress.landmark
          ].filter(Boolean).join(', ')
        : [
            item.deliveryAddress.address,
            item.deliveryAddress.locality,
            item.deliveryAddress.city,
            item.deliveryAddress.state,
            item.deliveryAddress.pincode,
            item.deliveryAddress.landmark
          ].filter(Boolean).join(', ')
      }
    </Text>
    {item.deliveryAddress.mobile ? (
      <Text style={{ fontWeight: 'bold' }} >Mobile: {item.deliveryAddress.mobile}</Text>
    ) : null}
  </>
) : (
  <Text>{typeof item.deliveryAddress === 'string' ? item.deliveryAddress : 'N/A'}</Text>
)}
          </View>
        )}
        ListEmptyComponent={<Text>No orders found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
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
    marginTop: 10,
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
  orderItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
});