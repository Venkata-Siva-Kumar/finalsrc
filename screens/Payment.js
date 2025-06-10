import React from 'react';
import { View, Text, Button, Alert, Linking } from 'react-native';

// Standalone function for UPI payment
export const payViaUPI = async ({ amount }) => {
  const upiID = 'Q726786625@ybl'; // Replace with your UPI ID
  const payeeName = 'Mariyala Venkata Siva Kumar';
  const transactionNote = 'Kirana order payment';
  const currency = 'INR';

  const url = `upi://pay?pa=${upiID}&pn=${payeeName}&tn=${transactionNote}&am=${amount}&cu=${currency}`;

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    Linking.openURL(url);
  } else {
    Alert.alert('Error', 'No UPI app found or UPI not supported');
  }
};

const Payment = ({ cart = [], totalAmount = "0.00", selectedMethod }) => {
  // If you want to recalculate totalAmount from cart, uncomment below:
  // const totalAmount = cart.length > 0
  //   ? cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
  //   : "0.00";

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Pay ₹{totalAmount}
      </Text>
      {/* Example: Show selected payment method */}
      {selectedMethod && (
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Selected Method: {selectedMethod}
        </Text>
      )}
      {/* Example: Button to pay via UPI */}
      {/* <Button title="Pay with UPI" onPress={() => payViaUPI({ amount: totalAmount })} /> */}
    </View>
  );
};

export default Payment;