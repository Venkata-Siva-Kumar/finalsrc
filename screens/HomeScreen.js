import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CartContext } from './CartContext';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../UserContext'; // <-- Make sure you have this

export default function HomeScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const { cart, setCart } = useContext(CartContext);
  const [quantities, setQuantities] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Get logged in user id from context
  const { user } = useContext(UserContext);
  const loggedInUserId = user?.id;

  // Cache products per category for fast switching
  const productsCache = useRef({});

  // Fetch products
  useEffect(() => {
    let url;
    setLoading(true);
    if (searchQuery.trim() !== '') {
      url = `${API_BASE_URL}/products?search=${encodeURIComponent(searchQuery.trim())}`;
      axios
        .get(url)
        .then((res) => {
          setProducts(res.data.filter((p) => p.status === 'enabled'));
        })
        .catch(() => {
          Alert.alert('Error', 'Failed to load products');
        })
        .finally(() => setLoading(false));
    } else if (selectedCategoryId) {
      // Use cache if available
      if (productsCache.current[selectedCategoryId]) {
        setProducts(productsCache.current[selectedCategoryId]);
        setLoading(false);
      } else {
        url = `${API_BASE_URL}/products?category_id=${selectedCategoryId}`;
        axios
          .get(url)
          .then((res) => {
            const filtered = res.data.filter((p) => p.status === 'enabled');
            productsCache.current[selectedCategoryId] = filtered;
            setProducts(filtered);
          })
          .catch(() => {
            Alert.alert('Error', 'Failed to load products');
          })
          .finally(() => setLoading(false));
      }
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [selectedCategoryId, searchQuery]);

  // Fetch categories from backend
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/categories`)
      .then((res) => setCategories(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load categories'));
  }, []);

  // Sync quantities with cart on mount/focus
  useFocusEffect(
    React.useCallback(() => {
      const qtyObj = {};
      cart.forEach((item) => {
        qtyObj[item.id] = item.quantity;
      });
      setQuantities(qtyObj);
    }, [cart])
  );

  // Update quantity handler with backend sync
  const updateQuantity = (product, delta) => {
    const current = quantities[product.id] || 0;
    const next = Math.max(0, Math.min(5, current + delta));
    setQuantities(prev => ({ ...prev, [product.id]: next }));
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item.id !== product.id);
      if (next > 0) {
        // Save to backend
        if (loggedInUserId) {
          axios.post(`${API_BASE_URL}/cart`, {
            user_id: loggedInUserId,
            product_id: product.id,
            quantity: next,
          }).catch(() => {});
        }
        return [...updatedCart, { ...product, quantity: next }];
      } else {
        // Remove from backend
        if (loggedInUserId) {
          axios.delete(`${API_BASE_URL}/cart`, {
            data: { user_id: loggedInUserId, product_id: product.id }
          }).catch(() => {});
        }
        return updatedCart;
      }
    });
  };

  // Add to cart handler with backend sync
  const handleAdd = (product) => {
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    setCart((prevCart) => {
      // Save to backend
      if (loggedInUserId) {
        axios.post(`${API_BASE_URL}/cart`, {
          user_id: loggedInUserId,
          product_id: product.id,
          quantity: 1,
        }).catch(() => {});
      }
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Render product item
  const renderItem = ({ item }) => {
    const quantity = quantities[item.id] || 0;
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Image
            source={{
              uri:
                item.image_url && item.image_url !== 'NULL'
                  ? item.image_url
                  : 'https://via.placeholder.com/100',
            }}
            style={styles.image}
          />
          <View style={styles.infoColumn}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
          <View style={styles.actionColumn}>
            {quantity === 0 ? (
              <TouchableOpacity onPress={() => handleAdd(item)} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item, -1)}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(item, 1)}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Search Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderColor: '#e0e0e0',
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          margin: 8,
          backgroundColor: '#fff',
          height: 40,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 16 }}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 8 }} />
      </View>

      {/* Main content: Sidebar + Product List */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{
          width: 90,
          backgroundColor: '#f7f7f7',
          borderRightWidth: 1,
          borderRightColor: '#e0e0e0',
          paddingTop: 1,
          paddingBottom: 12,
        }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  backgroundColor: selectedCategoryId === cat.id ? '#e0e7ff' : 'transparent',
                  borderRadius: 8,
                  marginBottom: 2,
                }}
                onPress={() => {
                  setSelectedCategoryId(cat.id);
                  setSearchQuery('');
                }}
              >
                <Image
                  source={{ uri: cat.image_url ? cat.image_url : 'https://via.placeholder.com/36' }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 40,
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#e0e0e0',
                    marginBottom: 4,
                  }}
                />
                <Text style={{ fontSize: 13, color: '#333', textAlign: 'center' }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Product List */}
        <View style={{ flex: 1, padding: 8 }}>
          {loading ? (
            <Text style={{ textAlign: 'center', marginTop: 30 }}>Loading...</Text>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30 }}>No products found.</Text>}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
  actionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    backgroundColor: '#ddd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});