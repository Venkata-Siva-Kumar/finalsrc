import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, Image, TextInput, ActivityIndicator, Modal,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    address: '', city: '', state: '', landmark: '',
  });
  const [showSelectAddressModal, setShowSelectAddressModal] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [variantQuantities, setVariantQuantities] = useState({});

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Delivery charge (always free for now)
  const [deliveryChargeSetting, setDeliveryChargeSetting] = useState({ delivery_charge: 0, free_delivery_limit: 0 });

  useEffect(() => {
    fetch(`${API_BASE_URL}/delivery-settings`)
      .then(res => res.json())
      .then(data => setDeliveryChargeSetting(data))
      .catch(() => setDeliveryChargeSetting({ delivery_charge: 0, free_delivery_limit: 0 }));
  }, []);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const FREE_DELIVERY_LIMIT = Number(deliveryChargeSetting.free_delivery_limit || 0);
  const DELIVERY_CHARGE = Number(deliveryChargeSetting.delivery_charge || 0);

  const isFreeDelivery = totalAmount >= FREE_DELIVERY_LIMIT;
  const deliveryCharge = isFreeDelivery ? 0 : DELIVERY_CHARGE;
  const amountForFreeDelivery = isFreeDelivery ? 0 : FREE_DELIVERY_LIMIT - totalAmount;


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

  useEffect(() => {
    fetchAddresses();
  }, [loggedInMobile]);


  // Coupon logic
  useEffect(() => {
    setFinalAmount(totalAmount - discount);
  }, [totalAmount, discount]);

  // Remove coupon if cart is empty or totalAmount is 0
  useEffect(() => {
    if (cart.length === 0 || totalAmount < 1) {
      setCouponCode('');
      setDiscount(0);
      setCouponMessage('');
    }
  }, [cart, totalAmount]);

  // Accept only capital letters for coupon code
  const handleCouponCodeInput = (text) => {
    setCouponCode(text.replace(/[^A-Z]/g, '').toUpperCase());
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      setCouponMessage('Please enter a coupon code');
      return;
    }
    setIsApplying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/apply-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: couponCode, cart_value: Number(totalAmount) }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscount(Number(data.discount));
        setFinalAmount(Number(data.final_value));
        setCouponMessage(`Coupon applied! You saved ₹${data.discount}`);
      } else {
        setDiscount(0);
        setFinalAmount(totalAmount);
        setCouponMessage(data.message || 'Invalid coupon');
      }
    } catch (err) {
      setCouponMessage('Error applying coupon');
    }
    setIsApplying(false);
  };

  // Update cart quantity and sync to backend
  const handleQuantityChange = (productId, variantId, newQuantity) => {
    // Reset coupon and discount when cart is updated
    setCouponCode('');
    setDiscount(0);
    setCouponMessage('');

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
    // Reset coupon and discount when cart is updated
    setCouponCode('');
    setDiscount(0);
    setCouponMessage('');

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
            address,
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
            address,
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
              const res = await fetch(`${API_BASE_URL}/addresses/${addressToRemove.id}`, { method: 'DELETE' });
              const data = await res.json();
              if (!res.ok) {
                // Show backend error message (e.g. pending orders)
                Alert.alert('Cannot Remove Address', data.message || 'Failed to remove address from database.');
                return;
              }
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
    setShowSelectAddressModal(false);
  }

  const proceedToPayment = async () => {
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

  // --- Pincode validation using /pincodes endpoint ---
  const pincode = selectedAddress.pincode;
  try {
    const res = await fetch(`${API_BASE_URL}/pincodes`);
    const validPincodes = await res.json();
    if (!Array.isArray(validPincodes) || !validPincodes.includes(pincode)) {
      Alert.alert('Delivery Not Available', `Sorry, we do not deliver to pincode ${pincode}.`);
      return;
    }
  } catch (e) {
    Alert.alert('Error', 'Could not validate pincode. Please try again.');
    return;
  }

  navigation.navigate('Payment', {
    cart,
    userMobile: cleanMobile,
    selectedAddress,
    totalAmount: finalAmount + deliveryCharge, // include delivery charge
    originalAmount: totalAmount,
    discount,
    couponCode,
    user_id: loggedInUserId,
    deliveryCharge,
    freeDeliveryLimit: FREE_DELIVERY_LIMIT,
  });
};

  const editAddress = async (index) => {
    const addr = addresses[index];
    // Check for pending orders before allowing edit
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/${addr.id}/pending-orders`);
      const data = await res.json();
      if (data.hasPending) {
        Alert.alert(
          'Cannot Edit Address',
          'This address is linked to pending orders and cannot be edited.'
        );
        return;
      }
    } catch (e) {
      Alert.alert('Error', 'Could not check pending orders for this address.');
      return;
    }

    let fullAddress = '';
    if (typeof addr.address === 'string') {
      fullAddress = addr.address;
    } else {
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

  // --- UI ---
  return (
    <View style={styles.container}>
      {/* Address Card at Top */}
      <View style={styles.addressCard}>
        {selectedAddressIndex !== null && addresses[selectedAddressIndex] ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>
                Deliver to: <Text style={{ color: '#222' }}>{addresses[selectedAddressIndex].name}</Text>
                {addresses[selectedAddressIndex].pincode ? `, ${addresses[selectedAddressIndex].pincode}` : ''}
                <Text style={styles.homeBadge}> HOME </Text>
              </Text>
              <Text style={{ color: '#555', marginTop: 2 }} numberOfLines={2} ellipsizeMode="tail">
                {(() => {
                  const addr = addresses[selectedAddressIndex];
                  let fullAddress = '';
                  try {
                    fullAddress = (typeof addr.address === 'string'
                      ? JSON.parse(addr.address).fullAddress
                      : addr.address.fullAddress
                    );
                  } catch {
                    fullAddress = addr.address || '';
                  }
                  return [
                    fullAddress,
                    addr.locality,
                    addr.city,
                    addr.state,
                    addr.landmark
                  ].filter(Boolean).join(', ');
                })()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowSelectAddressModal(true)} style={styles.changeBtn}>
              <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Change</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.selectAddressBtn} onPress={() => setShowSelectAddressModal(true)}>
            <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Select Delivery Address</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Coupon Section */}
      <View style={{ marginVertical: 0, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 8 }}>
        
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 5,
              padding: 8,
              marginRight: 8,
              backgroundColor: "#fff",
            }}
            placeholder="Enter coupon code"
            placeholderTextColor="#888"
            value={couponCode}
            onChangeText={handleCouponCodeInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={{
              backgroundColor: "#ff9500",
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 5,
            }}
            onPress={handleApplyCoupon}
            disabled={isApplying}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {isApplying ? "Applying..." : "Apply"}
            </Text>
          </TouchableOpacity>
        </View>
        {couponMessage ? (
          <Text style={{ color: discount > 0 ? "green" : "red", marginTop: 6 }}>
            {couponMessage}
          </Text>
        ) : null}
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.product_id}_${item.variant_id}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Your cart is empty.</Text>}
      />

      {/* Price Details Section */}
      <View style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        marginTop: 5,
        padding: 10,
        paddingTop: 0,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 7 }}>Price Details</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text>Price ({totalItems} item{totalItems > 1 ? "s" : ""})</Text>
          <Text>₹{totalAmount.toFixed(2)}</Text>
        </View>
        {discount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={{ color: "green" }}>Discount</Text>
            <Text style={{ color: "green" }}>- ₹{discount.toFixed(2)}</Text>
          </View>
        )}
        {cart.length > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text>Delivery Charges</Text>
            <Text style={{ color: isFreeDelivery ? "green" : "red" }}>
              {isFreeDelivery ? "FREE Delivery" : `₹${DELIVERY_CHARGE}`}
            </Text>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: "#eee", marginVertical: 8 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0 }}>
        <Text style={{ fontWeight: "bold" }}>Total Amount</Text>
          <Text style={{ fontWeight: "bold" }}>
            ₹{cart.length === 0 ? "0.00" : (finalAmount + deliveryCharge).toFixed(2)}
          </Text>
        </View>

        {discount > 0 && (
          <Text style={{ color: "green", marginTop: 3 }}>
            You will save ₹{discount.toFixed(2)} on this order
          </Text>
        )}
      </View>

      {/* Address Selection Modal */}
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
              let fullAddress = '';
              try {
                fullAddress = (typeof addr.address === 'string'
                  ? JSON.parse(addr.address).fullAddress
                  : addr.address.fullAddress
                );
              } catch {
                fullAddress = addr.address || '';
              }
              return (
                <View
                  key={idx}
                  style={[
                    styles.addressSelectable,
                    idx === selectedAddressIndex && { borderColor: '#007bff', backgroundColor: '#e6f0ff' }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold' }}>{addr.name} <Text style={styles.homeBadge}>HOME</Text></Text>
                    <Text style={{ color: '#555', marginTop: 2 }} numberOfLines={2}>
                      {[fullAddress, addr.locality, addr.city, addr.state, addr.pincode, addr.landmark].filter(Boolean).join(', ')}
                    </Text>
                    <Text style={{ color: '#555', marginTop: 2 }}>Mobile: {addr.addr_mobile}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      style={[styles.orderButton, { backgroundColor: '#ff9500', marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8 }]}
                      onPress={() => {
                        setSelectedAddressIndex(idx);
                        setShowSelectAddressModal(false);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Deliver Here</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => editAddress(idx)} style={{ marginRight: 15 }}>
                        <Text style={{ color: 'blue' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeAddress(idx)}>
                        <Text style={{ color: 'red' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={[styles.orderButton, { backgroundColor: '#aaa', marginTop: 20 }]} onPress={() => setShowSelectAddressModal(false)}>
            <Text style={styles.orderButtonText}>Cancel</Text>
          </TouchableOpacity>
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
              maxLength={30}
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
              placeholder="Address(Flat,House No,Building,Company,Apartment)"
              placeholderTextColor="#888"
              multiline={true}
              maxLength={100}
            />

            <Text>Locality/Area/Street <Text style={{ color: 'red' }}> *</Text> </Text>
            <TextInput
              style={[styles.input, addressTouched.locality && !addressForm.locality ? styles.inputError : null]}
              value={addressForm.locality}
              onChangeText={(text) => setAddressForm({ ...addressForm, locality: text })}
              placeholder="Locality"
              placeholderTextColor="#888"
              maxLength={30}
            />

            <Text>City/Town</Text>
            <TextInput
              style={styles.input}
              value={addressForm.city}
              onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
              placeholder="City/Town"
              placeholderTextColor="#888"
              maxLength={30}
            />

            <Text>State/Province/Region</Text>
            <TextInput
              style={styles.input}
              value={addressForm.state}
              onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
              placeholder="State/Province/Region"
              placeholderTextColor="#888"
              maxLength={30}

            />

            <Text>Landmark(Optional)</Text>
            <TextInput
              style={styles.input}
              value={addressForm.landmark}
              onChangeText={(text) => setAddressForm({ ...addressForm, landmark: text })}
              placeholder="Landmark(Optional)"
              placeholderTextColor="#888"
              maxLength={30}

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

      {cart.length > 0 && !isFreeDelivery && (
        <View style={{
          backgroundColor: '#fffbe6',
          borderRadius: 8,
          padding: 10,
          marginTop: 10,
          marginBottom: 5,
          borderWidth: 1,
          borderColor: '#ffe58f',
          alignItems: 'center'
        }}>
          <Text style={{ color: '#b26a00', fontWeight: 'bold' }}>
            Add items worth ₹{amountForFreeDelivery} more for FREE delivery
          </Text>
        </View>
      )}


      <TouchableOpacity
        style={[styles.proceedButton, selectedAddressIndex === null && styles.proceedButtonDisabled]}
        onPress={proceedToPayment}
        disabled={selectedAddressIndex === null}
      >
        <Text style={styles.proceedButtonText}>Proceed To Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 0,
    minHeight: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectAddressBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  changeBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: '#e6f0ff',
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 2, borderBottomWidth: 1, borderBottomColor: '#ccc'
  },
  image: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' },
  info: { flex: 1, marginLeft: 10 },
  name: { fontWeight: 'bold', fontSize: 16 },
  details: { color: '#555', marginTop: 4  },
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007bff',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  proceedButton: {
    backgroundColor: '#ff9500',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 0
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
    marginTop: 6,
  },
  quantityButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 7,
    paddingVertical: 0,
    borderRadius: 5,
    marginRight: 10,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
    marginLeft: 0,
  },
  inputError: {
    borderColor: 'red',
    backgroundColor: '#fff0f0',
  },
  homeBadge: {
    backgroundColor: '#e6f0ff',
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 6,
    marginLeft: 6,
    overflow: 'hidden',
  },
});