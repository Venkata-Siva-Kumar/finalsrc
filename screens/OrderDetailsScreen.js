import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../config'; // Make sure this import is correct
import * as Print from 'expo-print';

import getPrintHtml from './Print.js';

export default function OrderDetailsScreen({ route, navigation }) {
  const { order, productMap } = route.params;
  const [loading, setLoading] = useState(false);

  const updateOrderStatus = async (status) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', `Order marked as ${status}.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to update order status.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status.');
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    try {
     // console.log('Print button pressed', order);
      if (!order.items || order.items.length === 0) {
        Alert.alert('No Products', 'No products found in this order to print.');
        return;
      }
      const html = getPrintHtml(order, productMap); // Use the helper!
      await Print.printAsync({ html });
    } catch (err) {
      console.error('Print error:', err);
      Alert.alert('Print Error', err.message || 'Failed to print');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        
        <Text style={styles.label}>Order ID: <Text style={styles.value}>{order.orderId}</Text></Text>
        <Text style={styles.label}>User: <Text style={styles.value}>{order.userMobile}</Text></Text>
        <Text style={styles.label}>Total: <Text style={styles.value}>₹{order.totalAmount}</Text></Text>
        <Text style={styles.label}>Status: <Text style={styles.value}>{order.orderStatus}</Text></Text>
        <Text style={styles.label}>Date: <Text style={styles.value}>{order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A'}</Text></Text>
        <Text style={[styles.label, {marginTop: 10}]}>Products:</Text>
        {order.items && order.items.length > 0 ? (
          order.items.map((prod, idx) => (
            <Text key={idx} style={styles.value}>
              • {prod.name || productMap[prod.productId || prod.id] || 'Unknown'} x {prod.quantity} @ ₹{prod.price}
            </Text>
          ))
        ) : (
          <Text style={styles.value}>No products in this order.</Text>
        )}
        <Text style={[styles.label, {marginTop: 10}]}>Address:</Text>
        {order.deliveryAddress && typeof order.deliveryAddress === 'object' && !Array.isArray(order.deliveryAddress) ? (
          <>
            {order.deliveryAddress.name ? <Text style={styles.value}>Name: {order.deliveryAddress.name}</Text> : null}
            {order.deliveryAddress.mobile ? <Text style={styles.value}>Mobile: {order.deliveryAddress.mobile}</Text> : null}
            {order.deliveryAddress.address && typeof order.deliveryAddress.address === 'object' && !Array.isArray(order.deliveryAddress.address) ? (
              <>
                {order.deliveryAddress.address.street ? <Text style={styles.value}>Street: {order.deliveryAddress.address.street}</Text> : null}
                {order.deliveryAddress.address.area ? <Text style={styles.value}>Area: {order.deliveryAddress.address.area}</Text> : null}
                {order.deliveryAddress.address.house ? <Text style={styles.value}>House: {order.deliveryAddress.address.house}</Text> : null}
              </>
            ) : (
              order.deliveryAddress.address ? <Text style={styles.value}>Address: {order.deliveryAddress.address}</Text> : null
            )}
            {order.deliveryAddress.locality ? <Text style={styles.value}>Locality: {order.deliveryAddress.locality}</Text> : null}
            {order.deliveryAddress.city ? <Text style={styles.value}>City: {order.deliveryAddress.city}</Text> : null}
            {order.deliveryAddress.state ? <Text style={styles.value}>State: {order.deliveryAddress.state}</Text> : null}
            {order.deliveryAddress.pincode ? <Text style={styles.value}>Pincode: {order.deliveryAddress.pincode}</Text> : null}
            {order.deliveryAddress.landmark ? <Text style={styles.value}>Landmark: {order.deliveryAddress.landmark}</Text> : null}
          </>
        ) : (
          <Text style={styles.value}>
            {typeof order.deliveryAddress === 'string' ? order.deliveryAddress : 'N/A'}
          </Text>
        )}
      </ScrollView>
      {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={() => updateOrderStatus('Delivered')}
            disabled={loading}
          >
            {loading ? (<ActivityIndicator color="#fff" />) : ( <Text style={[styles.buttonText, { paddingLeft: 0 }]}>Deliver</Text>)}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff3b30' }]}
            onPress={() => updateOrderStatus('Cancelled')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cancel</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={handlePrint}
            disabled={loading}
            >
            <Text style={styles.buttonText}>Print</Text>
            </TouchableOpacity>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef3f9', padding: 16 },
  label: { fontWeight: 'bold', fontSize: 16, marginTop: 8 },
  value: { fontSize: 15, color: '#333', marginLeft: 8, marginTop: 2 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', 
    flexDirection: 'row',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});