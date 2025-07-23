import React, { useState, useContext } from "react";
import Payment2 from "./Payment";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { CartContext } from "./CartContext";
import { API_BASE_URL } from "../config";

// Cross-platform alert
function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title ? title + "\n" : ""}${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function generateOrderId() {
  const now = new Date();
  const pad = (n, l = 2) => n.toString().padStart(l, "0");
  const orderId = `ORD${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}${pad(now.getMilliseconds(), 3)}`;
  return orderId;
}

export default function PaymentScreen({ navigation, route }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
 const { cart } = useContext(CartContext);
  const userMobile = route?.params?.userMobile || "9876543210";
  const selectedAddress = route?.params?.selectedAddress || {};
  const address_id = selectedAddress.id || selectedAddress.address_id || null;
  const totalAmount = route.params?.totalAmount?.toFixed
    ? route.params.totalAmount.toFixed(2)
    : (route.params?.totalAmount || "0.00");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const { setCart } = useContext(CartContext);
  const user_id = route.params?.user_id;

  const handlePaymentSelect = (method) => {
    if (method !== "Cash on Delivery") {
      showAlert(
        "Unavailable",
        `${method} is temporarily unavailable. Please select Cash on Delivery.`
      );
      return;
    }
    setSelectedMethod(method);
  };

  const handleOrderConfirm = async () => {
    if (!selectedMethod) {
      showAlert("Select Payment", "Please select a payment method");
      return;
    }
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      const orderId = generateOrderId();
      const now = new Date();
      const orderDate = now.toISOString().slice(0, 19).replace('T', ' ');

      const orderData = {
        orderId,
        totalAmount: parseFloat(route.params?.originalAmount || totalAmount),
        orderDate,
        orderStatus: "Pending",
        user_id: user_id || null,
        mobile: userMobile,
        address_id: address_id,
        items: cart.map(item => ({
          productId: item.product_id || item.id,
          variantId: item.variant_id,
          quantity: item.quantity,
          price: item.price,
          mrp: item.mrp,
          quantity_value: item.quantity_value
        })),
        coupon_code: route.params?.couponCode || null,
        discount: route.params?.discount || 0,
        final_amount: parseFloat(route.params?.totalAmount || totalAmount),
        delivery_charge: route.params?.deliveryCharge || 0 ,
      };

      const response = await fetch(`${API_BASE_URL}/place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showAlert("Order Placed", `Your order ID is: ${orderId}`);
        setCart([]); // Clear cart in context
        setOrderSuccess(true);
        if (route?.params?.user_id) {
          fetch(`${API_BASE_URL}/cart/clear`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: route.params.user_id }),
          });
        }

        // Show countdown and redirect
        setCountdown(1);
        let timer = 1;
        const interval = setInterval(() => {
          timer -= 1;
          if (timer > 0) {
            setCountdown(timer);
          } else {
            clearInterval(interval);
            setCountdown("Redirecting to Home...");
            setTimeout(() => {
              setCountdown(null);
              navigation.reset({
                index: 0,
                routes: [
                  { name: "Main", params: { screen: "Home", userMobile, refreshAddresses: true, refresh: Date.now() } }
                ],
              });
            }, 700);
          }
        }, 1000);
      } else {
        showAlert(
          "Order Failed",
          result.error || result.message || "Could not place order. Please try again."
        );
        setIsPlacingOrder(false);
      }
    } catch (error) {
      showAlert("Order Failed", "Could not place order. Please try again.");
      console.error(error);
    }
    setIsPlacingOrder(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select Payment Method</Text>

      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === "Credit Card" && styles.selectedMethodButton,
        ]}
        onPress={() => handlePaymentSelect("Credit Card")}
      >
        <Ionicons name="card-outline" size={24} color="#333" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.methodText,
            selectedMethod === "Credit Card" && styles.selectedMethodText,
          ]}
        >
          Credit Card
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === "Debit Card" && styles.selectedMethodButton,
        ]}
        onPress={() => handlePaymentSelect("Debit Card")}
      >
        <Ionicons name="card" size={24} color="#333" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.methodText,
            selectedMethod === "Debit Card" && styles.selectedMethodText,
          ]}
        >
          Debit Card
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === "UPI" && styles.selectedMethodButton,
        ]}
        onPress={() => handlePaymentSelect("UPI")}
      >
        <Ionicons name="logo-google" size={24} color="#333" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.methodText,
            selectedMethod === "UPI" && styles.selectedMethodText,
          ]}
        >
          UPI
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === "Net Banking" && styles.selectedMethodButton,
        ]}
        onPress={() => handlePaymentSelect("Net Banking")}
      >
        <Ionicons name="business-outline" size={24} color="#333" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.methodText,
            selectedMethod === "Net Banking" && styles.selectedMethodText,
          ]}
        >
          Net Banking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === "Cash on Delivery" && styles.selectedMethodButton,
        ]}
        onPress={() => handlePaymentSelect("Cash on Delivery")}
      >
        <Ionicons name="cash-outline" size={24} color="#333" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.methodText,
            selectedMethod === "Cash on Delivery" && styles.selectedMethodText,
          ]}
        >
          Cash on Delivery
        </Text>
      </TouchableOpacity>

      <Payment2
        cart={cart}
        totalAmount={totalAmount}
        selectedMethod={selectedMethod}
      />

      {countdown !== null && (
        <Text
          style={{
            color: "green",
            fontSize: 20,
            textAlign: "center",
            marginVertical: 10,
          }}
        >
          {countdown}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.orderButton,
          (!selectedMethod || isPlacingOrder) && { backgroundColor: "#ccc" },
        ]}
        onPress={handleOrderConfirm}
        disabled={!selectedMethod || isPlacingOrder || orderSuccess}
      >
        <Text style={styles.orderButtonText}>
          {isPlacingOrder
            ? "Placing Order..."
            : orderSuccess
            ? "Order Placed"
            : "Order Now"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  methodButton: {
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    marginBottom: 16,
    alignItems: "center",
  },
  selectedMethodButton: {
    backgroundColor: "#4caf50",
  },
  methodText: {
    fontSize: 18,
    color: "#333",
  },
  selectedMethodText: {
    color: "#fff",
    fontWeight: "bold",
  },
  orderButton: {
    marginTop: 32,
    backgroundColor: "#4caf50",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  orderButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});