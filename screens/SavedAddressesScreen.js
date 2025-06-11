import React, { useEffect, useState,useLayoutEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, ScrollView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config';


export default function SavedAddressesScreen({ route ,navigation}) {
  const userId = route.params?.userId;
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: '', mobile: '', pincode: '', locality: '',
    address: '', city: '', state: '', landmark: '',
  });

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/addresses?user_id=${userId}`)
      .then(res => res.json())
      .then(data => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]));
  }, [userId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 18 }}
          onPress={() => {
            setEditingIndex(null);
            setAddressForm({
              name: '', mobile: '', pincode: '', locality: '',
              address: '', city: '', state: '', landmark: '',
            });
            setShowAddressModal(true);
          }}
        >
          <Text style={{ fontSize: 28, color: '#007bff', fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Remove address handler
  const removeAddress = (id, idx) => {
    Alert.alert(
      'Remove Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE_URL}/addresses/${id}`, { method: 'DELETE' });
              setAddresses(prev => {
                const updated = [...prev];
                updated.splice(idx, 1);
                return updated;
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove address.');
            }
          },
        },
      ]
    );
  };

  // Edit address handler (open modal and fill form)
  const editAddress = (index) => {
    const addr = addresses[index];
    let fullAddress = '';
    try {
      fullAddress = typeof addr.address === 'string'
        ? JSON.parse(addr.address).fullAddress
        : addr.address.fullAddress;
    } catch {
      fullAddress = '';
    }
    setEditingIndex(index);
    setAddressForm({
      ...addr,
      address: fullAddress,
    });
    setShowAddressModal(true);
  };

  // Save (update) address handler
  const saveAddress = async () => {
    const { name, mobile, pincode, locality, address, city, state, landmark } = addressForm;
    if (!name.trim() || !mobile.trim() || !pincode.trim() || !address.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    try {
      const addressJson = { fullAddress: address };
      if (editingIndex === null) {
        // Add new address
        const response = await fetch(`${API_BASE_URL}/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            name,
            mobile,
            pincode,
            locality,
            address: addressJson,
            city,
            state,
            landmark,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('Failed to add address: ' + errorText);
        }
        const newAddress = await response.json();
        setAddresses(prev => [...prev, newAddress]);
      } else {
        // Edit existing address
        const id = addresses[editingIndex]?.id;
        const response = await fetch(`${API_BASE_URL}/addresses/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            name,
            mobile,
            pincode,
            locality,
            address: addressJson,
            city,
            state,
            landmark,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('Failed to update address: ' + errorText);
        }
        const updatedAddress = await response.json();
        setAddresses(prev => {
          const updated = [...prev];
          updated[editingIndex] = updatedAddress;
          return updated;
        });
      }
      setShowAddressModal(false);
      setEditingIndex(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save address.');
    }
  };


  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.addressText}>
              {typeof item.address === 'string'
                ? JSON.parse(item.address).fullAddress
                : item.address.fullAddress}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Mobile: </Text>
              <Text style={styles.value}>{item.mobile}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pincode: </Text>
              <Text style={styles.value}>{item.pincode}</Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => editAddress(index)} style={styles.editBtn}>
                <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeAddress(item.id, index)} style={styles.removeBtn}>
                <Text style={{ color: '#ff4d4d', fontWeight: 'bold' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No addresses found.</Text>
        }
        contentContainerStyle={addresses.length === 0 && { flex: 1, justifyContent: 'center' }}
      />

      {/* Edit Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
              Add Address
            </Text>
            <Text>Name *</Text>
            <TextInput
              style={styles.input}
              value={addressForm.name}
              onChangeText={(text) => setAddressForm({ ...addressForm, name: text })}
              placeholder="Name"
              placeholderTextColor="#888"
            />
            <Text>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              value={addressForm.mobile}
              onChangeText={(text) => setAddressForm({ ...addressForm, mobile: text })}
              placeholder="Mobile Number"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Text>Pincode *</Text>
            <TextInput
              style={styles.input}
              value={addressForm.pincode}
              onChangeText={(text) => setAddressForm({ ...addressForm, pincode: text })}
              placeholder="Pincode"
              placeholderTextColor="#888"
              keyboardType="numeric"
              maxLength={6}
            />
            <Text>Address (Flat, House No, Building, Company, Apartment) *</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={addressForm.address}
              onChangeText={(text) => setAddressForm({ ...addressForm, address: text })}
              placeholder="Full Address"
              placeholderTextColor="#888"
              multiline={true}
            />
            <Text>Locality/Area/Street</Text>
            <TextInput
              style={styles.input}
              value={addressForm.locality}
              onChangeText={(text) => setAddressForm({ ...addressForm, locality: text })}
              placeholder="Locality"
              placeholderTextColor="#888"
            />
            <Text>City/Town</Text>
            <TextInput
              style={styles.input}
              value={addressForm.city}
              onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
              placeholder="City/Town"
              placeholderTextColor="#888"
            />
            <Text>State/Province/Region</Text>
            <TextInput
              style={styles.input}
              value={addressForm.state}
              onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
              placeholder="State/Province/Region"
              placeholderTextColor="#888"
            />
            <Text>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              value={addressForm.landmark}
              onChangeText={(text) => setAddressForm({ ...addressForm, landmark: text })}
              placeholder="Landmark (Optional)"
              placeholderTextColor="#888"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: '#aaa', padding: 12, borderRadius: 8 }]}
                onPress={() => {
                  setShowAddressModal(false);
                  setEditingIndex(null);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: '#28a745', padding: 12, borderRadius: 8 }]}
                onPress={saveAddress}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fa',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#007bff',
    marginBottom: 6,
  },
  addressText: {
    color: '#333',
    fontSize: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editBtn: {
    marginRight: 20,
  },
  removeBtn: {},
  label: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: 14,
  },
  value: {
    color: '#444',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});