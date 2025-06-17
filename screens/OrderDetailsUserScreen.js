import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

export default function OrderDetailsUserScreen({ route }) {
  const { order } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 52 }}>
      <Text style={styles.label}>Order ID: <Text style={styles.value}>{order.orderId}</Text></Text>
      <Text style={styles.label}>Date: <Text style={styles.value}>{order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A'}</Text></Text>
      <Text style={styles.label}>Status: <Text style={[styles.value, {
        color:
          order.orderStatus === 'Delivered'
            ? 'green'
            : order.orderStatus === 'Pending'
            ? 'orange'
            : order.orderStatus === 'Cancelled'
            ? 'red'
            : '#333',
            fontWeight: 'bold',
      }]}>{order.orderStatus}</Text></Text>
      <Text style={styles.label}>Total: <Text style={styles.value}>₹{order.totalAmount}</Text></Text>

      <Text style={[styles.label, { marginTop: 16 }]}>Products:</Text>
      {Array.isArray(order.items) && order.items.length > 0 ? (
        order.items.map((prod, idx) => (
          
          <View key={idx} style={styles.productRow}>
            
            {prod.image_url ? (
              <Image source={{ uri: prod.image_url }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#aaa' }}>No Image</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.productName}>{prod.name}</Text>
              <Text>Qty: {prod.quantity} ({prod.quantity_value})</Text>
              <Text>Price: ₹{prod.price} x {prod.quantity} = ₹{prod.price * prod.quantity}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={{ color: '#888' }}>No products found.</Text>
      )}

      <Text style={[styles.label, { marginTop: 16 }]}>Delivery Address:</Text>
      <Text style={styles.value}>
        {order.deliveryAddress && typeof order.deliveryAddress === 'object'
          ? [
              order.deliveryAddress.address && typeof order.deliveryAddress.address === 'object'
                ? [
                    order.deliveryAddress.address.house,
                    order.deliveryAddress.address.street,
                    order.deliveryAddress.address.area,
                  ].filter(Boolean).join(', ')
                : order.deliveryAddress.address,
              order.deliveryAddress.locality,
              order.deliveryAddress.city,
              order.deliveryAddress.state,
              order.deliveryAddress.pincode,
              order.deliveryAddress.landmark
            ].filter(Boolean).join(', ')
          : typeof order.deliveryAddress === 'string'
          ? order.deliveryAddress
          : 'N/A'
        }
      </Text>
      {order.deliveryAddress && order.deliveryAddress.mobile ? (
        <Text style={styles.value}>Mobile: {order.deliveryAddress.mobile}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { fontWeight: 'bold', marginTop: 8 },
  value: { fontWeight: 'normal', color: '#333' },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#f7f7f7', borderRadius: 8, padding: 8 },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  productName: { fontWeight: 'bold', fontSize: 16 },
});