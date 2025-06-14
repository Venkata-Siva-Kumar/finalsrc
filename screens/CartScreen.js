import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, Image, TextInput, ActivityIndicator, Modal,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { CartContext } from './CartContext';
import { API_BASE_URL } from '../config';
import { UserContext } from '../UserContext';
import axios from 'axios';

export default function CartScreen({ navigation, route }) {
  const { cart, setCart } = useContext(CartContext);
  const { user } = useContext(UserContext);
  const loggedInUserId = user?.id;
  const loggedInMobile = user?.mobile;
  const [addressTouched, setAddressTouched] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', addr_mobile: '', pincode: '', locality: '',
    address: '', city: '', state: '', landmark:'',
  });
  const [showSelectAddressModal, setShowSelectAddressModal] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [pincodeValid, setPincodeValid] = useState(false);
  const [variantQuantities, setVariantQuantities] = useState({});
  
  // Fetch cart from backend every time screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!loggedInUserId) return;
      setLoading(true);
      fetch(`${API_BASE_URL}/cart?user_id=${loggedInUserId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCart(data);
          else setCart([]);
        })
        .catch(() => setCart([]))
        .finally(() => setLoading(false));
    }, [loggedInUserId])
  );

  // Remove ordered products from cart after order
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.orderedProductIds) {
        const updatedCart = cart.filter(item =>
          !route.params.orderedProductIds.some(
            id => id.product_id === item.product_id && id.variant_id === item.variant_id
          )
        );
        setCart(updatedCart);
        navigation.setParams({ orderedProductIds: undefined });
      }
    }, [route.params?.orderedProductIds, cart])
  );

 const fetchAddresses = () => {
  if (!loggedInMobile) return;
  fetch(`${API_BASE_URL}/addresses?user_id=${loggedInMobile}`)
    .then(res => res.json())
    .then(data => setAddresses(Array.isArray(data) ? data : []))
    .catch(() => setAddresses([]));
};

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Update cart quantity and sync to backend
  const handleQuantityChange = (productId, variantId, newQuantity) => {
    if (newQuantity > 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 units of each product.');
      return;
    }
    if (newQuantity <= 0) {
      handleRemove(productId, variantId);
      return;
    }
    const updatedCart = cart.map(item =>
      item.product_id === productId && item.variant_id === variantId
        ? { ...item, quantity: newQuantity }
        : item
    );
    setCart(updatedCart);

    // Update in backend
    if (loggedInUserId) {
      fetch(`${API_BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loggedInUserId,
          product_id: productId,
          variant_id: variantId,
          quantity: newQuantity,
        }),
      });
    }
  };

  // Remove item from cart and sync to backend
  const handleRemove = (productId, variantId) => {
    const updatedCart = cart.filter(
      item => !(item.product_id === productId && item.variant_id === variantId)
    );
    setCart(updatedCart);

    // Remove from backend
    if (loggedInUserId) {
      fetch(`${API_BASE_URL}/cart`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loggedInUserId,
          product_id: productId,
          variant_id: variantId,
        }),
      });
    }
  };

  // Address helpers
  const [allowedPincodes, setAllowedPincodes] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pincodes`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllowedPincodes(data);
      })
      .catch(() => setAllowedPincodes([]));
  }, []);

  const validatePincode = async () => {
    const isValidFormat = /^\d{6}$/.test(pincode);
    const isAllowed = allowedPincodes.includes(pincode);

    if (!isValidFormat) {
      Alert.alert('Invalid Pincode', 'Please enter a 6-digit valid pincode.');
      setLocation('');
      setPincodeValid(false);
      return;
    }

    if (!isAllowed) {
      Alert.alert('Not deliverable for this pincode', pincode);
      setLocation('');
      setPincodeValid(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      const postOffice = data[0]?.PostOffice?.[0];
      if (postOffice) {
        setLocation(`${postOffice.Name}, ${postOffice.District}`);
        setPincodeValid(true);
      } else {
        Alert.alert('Pincode Not Found', 'No location found for this pincode.');
        setLocation('');
        setPincodeValid(false);
      }
    } catch (error) {
      setLocation('');
      setPincodeValid(false);
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async () => {
    const { name, addr_mobile, pincode, locality, address, city, state, landmark } = addressForm;
  const requiredFields = { name, addr_mobile, pincode, address, locality };
  let newTouched = {};
  let hasError = false;

  Object.entries(requiredFields).forEach(([key, value]) => {
    if (!value.trim()) {
      newTouched[key] = true;
      hasError = true;
    }
  });

  setAddressTouched(newTouched);

  if (hasError) {
    Alert.alert('Missing Fields', 'Please fill in all required fields (Name, Mobile, Pincode, Address, Locality).');
    return;
  }

    try {
      let response, savedAddress;
      if (editingIndex !== null && addresses[editingIndex]?.id) {
        // Update existing address
        response = await fetch(`${API_BASE_URL}/addresses/${addresses[editingIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: loggedInMobile,
            name,
            addr_mobile,
            pincode,
            locality,
            address: { fullAddress: address },
            city,
            state,
            landmark,
          }),
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error('Failed to update address');
        savedAddress = JSON.parse(responseText);
        setAddresses(prev => {
          const updated = [...prev];
          updated[editingIndex] = savedAddress;
          return updated;
        });
      } else {
        response = await fetch(`${API_BASE_URL}/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: loggedInMobile,
            name,
            addr_mobile,
            pincode,
            locality,
            address: { fullAddress: address },
            city,
            state,
            landmark,
          }),
        });
        if (!response.ok) throw new Error('Failed to add address');
        savedAddress = await response.json();
        setAddresses(prev => [...prev, savedAddress]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save address to database.');
      return;
    }
    
    setAddressForm({
      name: '', addr_mobile: '', pincode: '', locality: '',
      address: '', city: '', state: '', landmark: '',
    });
    setShowAddressModal(false);
    setEditingIndex(null);
  };

  const removeAddress = (index) => {
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
              const addressToRemove = addresses[index];
              if (addressToRemove.id) {
                await fetch(`${API_BASE_URL}/addresses/${addressToRemove.id}`, { method: 'DELETE' });
              }
              setAddresses(prev => {
                const updated = [...prev];
                updated.splice(index, 1);
                return updated;
              });
              if (selectedAddressIndex === index) setSelectedAddressIndex(null);
              else if (selectedAddressIndex > index) setSelectedAddressIndex(selectedAddressIndex - 1);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to remove address from database.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Image source={{ uri: item.image_url || 'https://via.placeholder.com/80' }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          {item.quantity_value} | Price: ₹{item.price} | Qty: {item.quantity}
        </Text>
        <Text style={styles.details}>Subtotal: ₹{item.price * item.quantity}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.product_id, item.variant_id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.product_id, item.variant_id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  function confirmSelectedAddress() {
    if (selectedAddressIndex === null) {
      Alert.alert('No Address Selected', 'Please select one address.');
      return;
    }
    const selected = addresses[selectedAddressIndex];
    if (!allowedPincodes.includes(selected.pincode)) {
      Alert.alert(
        'Not Deliverable',
        `Sorry, we are unable to deliver to this pincode ${selected.pincode}. Please select a different address.`
      );
      return;
    }
    setShowSelectAddressModal(false);
  }

  const proceedToPayment = () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart before proceeding.');
      return;
    }
    if (selectedAddressIndex === null) {
      Alert.alert('No Delivery Address', 'Please select a delivery address.');
      return;
    }
    const selectedAddress = addresses[selectedAddressIndex];
    const cleanMobile = (loggedInMobile || '').replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    navigation.navigate('Payment', {
      cart,
      userMobile: cleanMobile,
      selectedAddress,
      totalAmount,
      user_id: loggedInUserId,
    });
  };

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

  const getFullAddressString = (addr) => {
    let fullAddress = '';
    try {
      fullAddress = (typeof addr.address === 'string'
        ? JSON.parse(addr.address).fullAddress
        : addr.address.fullAddress
      );
    } catch {
      fullAddress = '';
    }
    return (
      fullAddress +
      ' - ' + (addr.locality || '') +
      ' - ' + (addr.state || '') +
      ' - ' + (addr.pincode || '')
    );
  };

  // This function is used by your HomeScreen/modal, not directly here
  const handleAddVariantToCart = (product, variant) => {
    const quantity = variantQuantities[variant.id] || 1;
    setCart(prevCart => {
      const existing = prevCart.find(
        item => item.product_id === product.id && item.variant_id === variant.id
      );
      if (existing) {
        return prevCart.map(item =>
          item.product_id === product.id && item.variant_id === variant.id
            ? { ...item, quantity }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            product_id: product.id,
            variant_id: variant.id,
            name: product.name,
            quantity_value: variant.quantity_value,
            price: variant.price,
            quantity,
            image_url: product.image_url,
          },
        ];
      }
    });

    // Sync with backend
    if (loggedInUserId) {
      axios.post(`${API_BASE_URL}/cart`, {
        user_id: loggedInUserId,
        product_id: product.id,
        variant_id: variant.id,
        quantity,
      }).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pincodeContainer}>
        <TextInput
          style={styles.pincodeInput}
          placeholder="Enter Pincode"
          placeholderTextColor="#888"
          keyboardType="numeric"
          maxLength={6}
          value={pincode}
          onChangeText={(text) => {
            setPincode(text);
            setPincodeValid(false);
            setLocation('');
          }}
        />
        <TouchableOpacity style={styles.checkButton} onPress={validatePincode}>
          <Text style={styles.checkButtonText}>Check</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="small" color="#007bff" />}
      {location ? <Text style={[styles.locationText, { color: 'green' }]}>Deliverable to: {location}</Text> : null}

      {selectedAddressIndex !== null ? (
        <View style={{ marginBottom: 10, backgroundColor: '#e6f7ff', padding: 12, borderRadius: 6 }}>
          <Text style={{ fontWeight: 'bold' }}>Deliver To:</Text>
          <Text style={{ fontSize: 14 }} numberOfLines={3} ellipsizeMode="tail">
            {(() => {
              const addr = addresses[selectedAddressIndex];
              let fullAddress = '';
              try {
                fullAddress = (typeof addr.address === 'string'
                  ? JSON.parse(addr.address).fullAddress
                  : addr.address.fullAddress
                );
              } catch {
                fullAddress = '';
              }
              // Combine all relevant fields into a single string
              return [
                addr.name,
                addr.addr_mobile,
                fullAddress,
                addr.locality,
                addr.city,
                addr.state,
                addr.pincode,
                addr.landmark
              ]
              .filter(Boolean)
              .join(', ');
            })()}
          </Text>
        </View>
      ) : (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: 'gray' }}>No delivery address selected</Text>
        </View>
      )}

      {/* Select Address Modal */}
      <Modal visible={showSelectAddressModal} animationType="slide" transparent={false}>
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Select Delivery Address</Text>
          <TouchableOpacity
            style={[styles.orderButton, { marginVertical: 10, backgroundColor: '#007bff' }]}
            onPress={() => {
              if (editingIndex === null && addresses.length >= 5) {
                Alert.alert('Limit Reached', 'You can only save up to 5 addresses.');
                return;
              }
              setEditingIndex(null);
              setAddressForm({
                name: '', addr_mobile: '', pincode: '', locality: '',
                address: '', city: '', state: '', landmark: '',
              });
              setShowSelectAddressModal(false);
              setShowAddressModal(true);
            }}
          >
            <Text style={styles.orderButtonText}>Add New Address</Text>
          </TouchableOpacity>

          <ScrollView>
            {addresses.map((addr, idx) => {
              const isSelected = selectedAddressIndex === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedAddressIndex(prev => (prev === idx ? null : idx))}
                  style={[styles.addressSelectable]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                    <View style={{ marginLeft: 10, flexShrink: 1 }}>
                      <Text style={{ fontWeight: 'bold' }}>{addr.name}</Text>
                      <Text numberOfLines={2}>
                        {getFullAddressString(addr)}
                      </Text>
                      <Text>Mobile: {addr.addr_mobile}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => editAddress(idx)} style={{ marginRight: 15 }}>
                      <Text style={{ color: 'blue' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeAddress(idx)}>
                      <Text style={{ color: 'red' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity style={[styles.orderButton, { backgroundColor: '#aaa' }]} onPress={() => setShowSelectAddressModal(false)}>
              <Text style={styles.orderButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.orderButton} onPress={confirmSelectedAddress}>
              <Text style={styles.orderButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
              {editingIndex !== null ? 'Edit Address' : 'Add Address'}
            </Text>

            <Text>Name <Text style={{ color: 'red' }}> *</Text> </Text>
            <TextInput
              style={[styles.input, addressTouched.name && !addressForm.name ? styles.inputError : null]}
              value={addressForm.name}
              onChangeText={(text) => setAddressForm({ ...addressForm, name: text })}
              placeholder="Name"
              placeholderTextColor="#888"
            />

            <Text>Mobile Number <Text style={{ color: 'red' }}> *</Text></Text>
            <TextInput
              style={[styles.input, addressTouched.addr_mobile && !addressForm.addr_mobile ? styles.inputError : null]}
              value={addressForm.addr_mobile}
              onChangeText={(text) => setAddressForm({ ...addressForm, addr_mobile: text })}
              placeholder="Mobile Number"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text>Pincode <Text style={{ color: 'red' }}> *</Text></Text>
            <TextInput
              style={[styles.input, addressTouched.pincode && !addressForm.pincode ? styles.inputError : null]}
              value={addressForm.pincode}
              onChangeText={(text) => setAddressForm({ ...addressForm, pincode: text })}
              placeholder="Pincode"
              placeholderTextColor="#888"
              keyboardType="numeric"
              maxLength={6}
            />

            <Text>Address(Flat,House No,Building,Company,Apartment)<Text style={{ color: 'red' }}> *</Text></Text>
            <TextInput
              style={[styles.input, { height: 80 }, addressTouched.address && !addressForm.address ? styles.inputError : null]}
              value={addressForm.address}
              onChangeText={(text) => setAddressForm({ ...addressForm, address: text })}
              placeholder="FullAddress(Flat,House No,Building,Company,Apartment)"
              placeholderTextColor="#888"
              multiline={true}
            />

            <Text>Locality/Area/Street <Text style={{ color: 'red' }}> *</Text> </Text>
            <TextInput
              style={[styles.input, addressTouched.locality && !addressForm.locality ? styles.inputError : null]}
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

            <Text>Landmark(Optional)</Text>
            <TextInput
              style={styles.input}
              value={addressForm.landmark}
              onChangeText={(text) => setAddressForm({ ...addressForm, landmark: text })}
              placeholder="Landmark(Optional)"
              placeholderTextColor="#888"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.orderButton, { backgroundColor: '#aaa' }]}
                onPress={() => {
                  setShowAddressModal(false);
                  setEditingIndex(null);
                }}
              >
                <Text style={styles.orderButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.orderButton} onPress={addAddress}>
                <Text style={styles.orderButtonText}>{editingIndex !== null ? 'Update' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.product_id}_${item.variant_id}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Your cart is empty.</Text>}
      />

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total Items: {totalItems}</Text>
        <Text style={styles.totalText}>Total Amount: ₹{totalAmount.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.orderButton, { marginBottom: 10 }]}
        onPress={() => {fetchAddresses(),setShowSelectAddressModal(true)}}
      >
        <Text style={styles.orderButtonText} >Select Delivery Address</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.proceedButton, selectedAddressIndex === null && styles.proceedButtonDisabled]}
        onPress={proceedToPayment}
        disabled={selectedAddressIndex === null}
      >
        <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc'
  },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  info: { flex: 1, marginLeft: 10 },
  name: { fontWeight: 'bold', fontSize: 16 },
  details: { color: '#555', marginTop: 4 },
  pincodeContainer: { flexDirection: 'row', marginBottom: 10 },
  pincodeInput: {
    flex: 1, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 5, padding: 8, marginRight: 10,
  },
  checkButton: {
    backgroundColor: '#007bff', padding: 10,
    borderRadius: 5, justifyContent: 'center',
  },
  checkButtonText: { color: '#fff', fontWeight: 'bold' },
  locationText: { marginBottom: 10, fontWeight: 'bold' },
  orderButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  totalText: { fontWeight: 'bold', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10,
    marginBottom: 10,
  },
  addressSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 3,
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  proceedButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  proceedButtonDisabled: {
    backgroundColor: '#999999',
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  inputError: {
  borderColor: 'red',
  backgroundColor: '#fff0f0',
},
});