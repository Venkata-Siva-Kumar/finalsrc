import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { API_BASE_URL } from '../config';

const AdminOfferScreen = () => {
  const [couponCode, setCouponCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minCart, setMinCart] = useState('');
  const [maxCart, setMaxCart] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [offers, setOffers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Format input as dd-mm-yyyy with auto hyphens
  function handleDateInput(text, setter) {
    let cleaned = text.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + '-' + cleaned.slice(2);
    } else if (cleaned.length <= 8) {
      formatted = cleaned.slice(0, 2) + '-' + cleaned.slice(2, 4) + '-' + cleaned.slice(4, 8);
    } else {
      formatted = cleaned.slice(0, 2) + '-' + cleaned.slice(2, 4) + '-' + cleaned.slice(4, 8);
    }
    setter(formatted);
  }

  // Fetch all offers
  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/offers`);
      const data = await res.json();
      setOffers(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch offers');
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Add or update offer
  const handleSubmit = async () => {
    if (!couponCode || !startDate || !endDate || !minCart || !maxCart || !discountPercent) {
      Alert.alert('All fields except Max Discount are required');
      return;
    }
    try {
      const payload = {
        coupon_code: couponCode,
        start_date: startDate,
        end_date: endDate,
        min_cart_value: minCart,
        max_cart_value: maxCart,
        discount_percent: discountPercent,
        max_discount: maxDiscount || null,
      };
      let url = `${API_BASE_URL}/api/offers`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE_URL}/api/offers/${editingId}`;
        method = 'PUT';
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert(editingId ? 'Offer updated' : 'Offer added', editingId ? 'Offer updated successfully' : 'Offer added successfully');
        setCouponCode('');
        setStartDate('');
        setEndDate('');
        setMinCart('');
        setMaxCart('');
        setDiscountPercent('');
        setMaxDiscount('');
        setEditingId(null);
        fetchOffers();
      } else {
        Alert.alert('Error', data.error || 'Failed to save offer');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Remove offer
  const handleRemove = async (id) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/offers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              fetchOffers();
            } else {
              Alert.alert('Error', data.error || 'Failed to delete offer');
            }
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  // Edit offer
  const handleEdit = (offer) => {
    setEditingId(offer.id);
    setCouponCode(offer.coupon_code);
    setStartDate(offer.start_date); // already dd-mm-yyyy from backend
    setEndDate(offer.end_date);     // already dd-mm-yyyy from backend
    setMinCart(String(offer.min_cart_value));
    setMaxCart(String(offer.max_cart_value));
    setDiscountPercent(String(offer.discount_percent));
    setMaxDiscount(offer.max_discount ? String(offer.max_discount) : '');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setCouponCode('');
    setStartDate('');
    setEndDate('');
    setMinCart('');
    setMaxCart('');
    setDiscountPercent('');
    setMaxDiscount('');
  };

  // Accept only capital letters for coupon code
  const handleCouponCodeInput = (text) => {
    // Remove non-letters and convert to uppercase
    setCouponCode(text.replace(/[^A-Z]/g, '').toUpperCase());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{editingId ? 'Edit Offer' : 'Create New Offer'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Coupon Code"
        value={couponCode}
        onChangeText={handleCouponCodeInput}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Start Date (dd-mm-yyyy)"
        placeholderTextColor="#888"
        value={startDate}
        onChangeText={text => handleDateInput(text, setStartDate)}
        keyboardType="numeric"
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="End Date (dd-mm-yyyy)"
        placeholderTextColor="#888"
        value={endDate}
        onChangeText={text => handleDateInput(text, setEndDate)}
        keyboardType="numeric"
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Min Cart Value"
        placeholderTextColor="#888"
        value={minCart}
        onChangeText={setMinCart}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Max Cart Value"
        placeholderTextColor="#888"
        value={maxCart}
        onChangeText={setMaxCart}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Discount Percent"
        placeholderTextColor="#888"
        value={discountPercent}
        onChangeText={setDiscountPercent}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Max Discount (optional)"
        placeholderTextColor="#888"
        value={maxDiscount}
        onChangeText={setMaxDiscount}
        keyboardType="numeric"
      />
      <Button title={editingId ? "Update Offer" : "Add Offer"} onPress={handleSubmit} />
      {editingId && (
        <Button title="Cancel Edit" color="gray" onPress={handleCancelEdit} />
      )}

      <Text style={[styles.title, { marginTop: 30 }]}>All Offers</Text>
      {offers.length === 0 && (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>No offers found.</Text>
      )}
      {offers.map(offer => (
        <View key={offer.id} style={styles.offerBox}>
          <Text style={styles.offerText}>Coupon: <Text style={{ fontWeight: 'bold' }}>{offer.coupon_code}</Text></Text>
          <Text style={styles.offerText}>Period: {offer.start_date} to {offer.end_date}</Text>
          <Text style={styles.offerText}>Cart: ₹{offer.min_cart_value} - ₹{offer.max_cart_value}</Text>
          <Text style={styles.offerText}>Discount: {offer.discount_percent}% {offer.max_discount ? `(Max ₹${offer.max_discount})` : ''}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(offer)}>
              <Text style={{ color: '#fff' }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(offer.id)}>
              <Text style={{ color: '#fff' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15, padding: 10 },
  offerBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 15, marginBottom: 15, backgroundColor: '#fafafa' },
  offerText: { fontSize: 15, marginBottom: 2 },
  editBtn: { backgroundColor: '#007bff', padding: 8, borderRadius: 5, marginRight: 10 },
  removeBtn: { backgroundColor: '#d9534f', padding: 8, borderRadius: 5 },
});

export default AdminOfferScreen;