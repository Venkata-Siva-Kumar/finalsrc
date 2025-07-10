import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import * as Print from 'expo-print';
import getPrintHtml from './Print.js';

// --- Cross-platform alert utility ---
function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const okBtn = buttons.find(
        b =>
          b.style === 'destructive' ||
          (b.text && (
            b.text.toLowerCase().includes('ok') ||
            b.text.toLowerCase().includes('yes') ||
            b.text.toLowerCase().includes('remove') ||
            b.text.toLowerCase().includes('delete')
          ))
      );
      const cancelBtn = buttons.find(
        b => b.style === 'cancel' || (b.text && b.text.toLowerCase().includes('cancel'))
      );
      const result = window.confirm(`${title ? title + '\n' : ''}${message || ''}`);
      if (result && okBtn && okBtn.onPress) okBtn.onPress();
      if (!result && cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
    } else {
      window.alert(`${title ? title + '\n' : ''}${message || ''}`);
      if (buttons && buttons[0] && buttons[0].onPress) buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

export default function OrderDetailsScreen({ route, navigation }) {
  const { order, productMap } = route.params;
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

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
        showAlert('Success', `Order marked as ${status}.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        showAlert('Error', data.message || 'Failed to update order status.');
      }
    } catch (err) {
      showAlert('Error', 'Failed to update order status.');
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);

    try {
      if (!order.items || order.items.length === 0) {
        showAlert('No Products', 'No products found in this order to print.');
        return;
      }
      const html = getPrintHtml(order, productMap); // Use the helper!
      // For web: open print dialog with the same HTML as mobile
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        await Print.printAsync({ html });
      }
    } catch (err) {
      console.error('Print error:', err);
      showAlert('Print Error', err.message || 'Failed to print');
    }
    finally {
      setPrinting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Order ID: <Text style={styles.value}>{order.orderId}</Text></Text>
        <Text style={styles.label}>User: <Text style={styles.value}>{order.userMobile}</Text></Text>
        <Text style={styles.label}>Total: <Text style={styles.value}>₹{order.totalAmount}</Text></Text>
        <Text style={styles.label}>
          Delivery Charge:{" "}
          <Text
            style={[
              styles.value,
              Number(order.delivery_charge) === 0 && { color: 'green', fontWeight: 'bold' }
            ]}
          >
            {Number(order.delivery_charge) > 0
              ? `₹${Number(order.delivery_charge).toFixed(2)}`
              : 'FREE Delivery'}
          </Text>
        </Text>
        {order.coupon_code && Number(order.discount) > 0 && (
          <View style={{ marginLeft: 0, marginTop: 7 }}>
            <Text style={[styles.label, { color: '#007bff' }]}>
              Coupon Applied: <Text style={{ fontWeight: 'bold' }}>{order.coupon_code}</Text>
            </Text>
            <Text style={[styles.label, { color: 'green' }]}>
              Discount: -₹{Number(order.discount).toFixed(2)}
            </Text>
          </View>
        )}
        <Text style={styles.label}>
          Final Amount:{" "}
          <Text style={styles.finalAmount}>
            ₹{order.final_amount != null ? order.final_amount : order.totalAmount}
          </Text>
        </Text>
        <Text style={styles.label}>
          Status:{" "}
          <Text
            style={[
              styles.value,
              order.orderStatus === 'Delivered'
                ? { color: 'green', fontWeight: 'bold' }
                : order.orderStatus === 'Pending'
                ? { color: 'orange', fontWeight: 'bold' }
                : order.orderStatus === 'Cancelled'
                ? { color: 'red', fontWeight: 'bold' }
                : { color: '#333' }
            ]}
          >
            {order.orderStatus}
          </Text>
        </Text>
        <Text style={styles.label}>Date: <Text style={styles.value}>{order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A'}</Text></Text>
        <Text style={[styles.label, {marginTop: 10}]}>Products:</Text>
        {order.items && order.items.length > 0 ? (
          order.items.map((prod, idx) => (
            <Text key={idx} style={styles.value}>
              • {prod.name || productMap[prod.productId || prod.id] || 'Unknown'}
              {prod.quantity_value ? ` (${prod.quantity_value})` : ''} x {prod.quantity} @ ₹{prod.price}
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
            disabled={loading || printing}
          >
            <Text style={styles.buttonText}>Print</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add this block for Delivered orders */}
      {order.orderStatus === 'Delivered' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff9500' }]}
            onPress={() => updateOrderStatus('Pending')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change to Pending</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={handlePrint}
            disabled={loading || printing}
          >
            <Text style={styles.buttonText}>Print</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add this block for Cancelled orders */}
      {order.orderStatus === 'Cancelled' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff9500' }]}
            onPress={() => updateOrderStatus('Pending')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change to Pending</Text>}
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
  finalAmount: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 8,
  },
});