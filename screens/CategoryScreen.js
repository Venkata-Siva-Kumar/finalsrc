import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import { CartContext } from './CartContext';

import { API_BASE_URL } from '../../config';


export default function CategoryScreen({ route, navigation }) {
  const { categoryKey, categoryLabel } = route.params;
  const [products, setProducts] = useState([]);
  const { cart, setCart } = useContext(CartContext);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/products?category=${categoryKey}`)
      .then((res) => setProducts(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load products'));
  }, [categoryKey]);

  const updateQuantity = (product, delta) => {
    setQuantities((prev) => {
      const current = prev[product.id] || 0;
      const next = Math.max(0, Math.min(5, current + delta));

      setCart((prevCart) => {
        const updatedCart = prevCart.filter((item) => item.id !== product.id);
        if (next > 0) {
          return [...updatedCart, { ...product, quantity: next }];
        }
        return updatedCart;
      });

      return { ...prev, [product.id]: next };
    });
  };

  const handleAdd = (product) => {
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    setCart((prevCart) => {
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
    <View style={styles.container}>
      <Text style={styles.header}>{categoryLabel}</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0f0f0' },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
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
    fontSize: 18,
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