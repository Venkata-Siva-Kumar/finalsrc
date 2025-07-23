import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

export default function OrderDetailsUserScreen({ route }) {
  const { order } = route.params;

  // Calculate price details
  const totalMRP = Number(order.items?.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0) || 0);
  const totalSelling = Number(order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0);
  const couponDiscount = Number(order.discount || 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const paymentFee = Number(order.payment_handling_fee || 0);
  const platformFee = Number(order.platform_fee || 0);
  const specialPrice = totalSelling - couponDiscount;
  const finalAmount =
    order.final_amount != null && !isNaN(order.final_amount)
      ? Number(order.final_amount)
      : totalSelling + deliveryCharge + paymentFee + platformFee - couponDiscount;
  const safeFinalAmount = !isNaN(finalAmount) && finalAmount != null ? finalAmount : 0;

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
      <Text style={styles.label}>Total: <Text style={styles.value}>₹{order.final_amount != null ? order.final_amount : order.totalAmount}</Text></Text>

      <Text style={[styles.label, { marginTop: 16 }]}>Delivery Address:</Text>
      <Text style={styles.value}>
        {order.deliveryAddress && typeof order.deliveryAddress === 'object'
          ? [
              order.deliveryAddress.name,
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

      <Text style={[styles.label, { marginTop: 20, marginBottom: 8, fontSize: 16 }]}>Price Details</Text>
      <View style={styles.priceDetailsBox}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Original price</Text>
          <Text style={styles.strike}>₹{totalMRP.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Selling price</Text>
          <Text>₹{totalSelling.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Coupon Discount</Text>
          <Text style={{ color: 'green' }}>- ₹{couponDiscount.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Special Price</Text>
          <Text>₹{specialPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery Fee</Text>
          <Text style={{ color: deliveryCharge > 0 ? '#333' : 'green', textDecorationLine: deliveryCharge > 0 ? 'none' : 'line-through' }}>
            {deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : 'Free'}
          </Text>
        </View>
        {paymentFee > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Payment Handling Fee</Text>
            <Text>₹{paymentFee.toFixed(2)}</Text>
          </View>
        )}
        {platformFee > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform fee</Text>
            <Text>₹{platformFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.priceRow, { borderTopWidth: 1, borderColor: '#eee', marginTop: 8, paddingTop: 8 }]}>
          <Text style={[styles.priceLabel, { fontWeight: 'bold' }]}>Total Amount</Text>
          <Text style={{ fontWeight: 'bold' }}>₹{safeFinalAmount.toFixed(2)}</Text>
        </View>
      </View>
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
  priceDetailsBox: { backgroundColor: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { color: '#333' },
  strike: { textDecorationLine: 'line-through', color: '#888' },
});