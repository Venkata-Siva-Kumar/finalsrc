// ✅ Fully Fixed HomeScreen.js (No double refresh, refresh on focus or category/search change)
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
  Modal,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { CartContext } from './CartContext';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../UserContext';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const { cart, setCart, cartLoaded } = useContext(CartContext);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [variantQuantities, setVariantQuantities] = useState({});
  const [popupVariantQuantities, setPopupVariantQuantities] = useState({});
  const [isConnected, setIsConnected] = useState(true);
  const { user } = useContext(UserContext);
  const loggedInUserId = user?.id;
  const productsCache = useRef({});
  const [error, setError] = useState(null);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerFlatListRef = useRef(null);
  const bannerTimer = useRef(null);
  const [isBannerPaused, setIsBannerPaused] = useState(false);

  const lastCategory = useRef(selectedCategoryId);
  const lastSearch = useRef(searchQuery);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (!isConnected) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="wifi" size={60} color="#ccc" />
        <Text style={{ color: 'red', fontSize: 18, marginTop: 10 }}>No Internet Connection</Text>
      </View>
    );
  }

  const syncVariantQuantitiesFromCart = () => {
    const qtyObj = {};
    cart.forEach((item) => {
      qtyObj[item.variant_id] = item.quantity;
    });
    setVariantQuantities(qtyObj);
  };

  const fetchCategories = async () => {
    try {
      const cached = await AsyncStorage.getItem('categories');
      if (cached) setCategories(JSON.parse(cached));
      const res = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(res.data);
      AsyncStorage.setItem('categories', JSON.stringify(res.data));
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const fetchProducts = async () => {
    let url;
    setLoading(true);
    setError(null);
    try {
      let cacheKey = '';
      if (searchQuery.trim() !== '') {
        url = `${API_BASE_URL}/products?search=${encodeURIComponent(searchQuery.trim())}`;
        cacheKey = `products_search_${searchQuery.trim()}`;
      } else if (selectedCategoryId) {
        url = `${API_BASE_URL}/products?category_id=${selectedCategoryId}`;
        cacheKey = `products_cat_${selectedCategoryId}`;
      }

      if (cacheKey) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) setProducts(JSON.parse(cached));
      }

      if (url) {
        const res = await axios.get(url);
        const enabledProducts = res.data.filter((p) => p.status === 'enabled');
        setProducts(enabledProducts);
        AsyncStorage.setItem(cacheKey, JSON.stringify(enabledProducts));
      } else {
        setProducts([]);
      }
    } catch {
      setError('Failed to load products');
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!cartLoaded) return;
      productsCache.current = {};
      fetchCategories();

      const categoryChanged = lastCategory.current !== selectedCategoryId;
      const searchChanged = lastSearch.current !== searchQuery;

      if (categoryChanged || searchChanged) {
        lastCategory.current = selectedCategoryId;
        lastSearch.current = searchQuery;
      }

      fetchProducts(); // always run on focus
      syncVariantQuantitiesFromCart();
    }, [cartLoaded, selectedCategoryId, searchQuery])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (cartLoaded) {
        syncVariantQuantitiesFromCart();
      }
    }, [cart, cartLoaded])
  );

  // Fetch banners on focus (only active banners)
  useFocusEffect(
    React.useCallback(() => {
      axios.get(`${API_BASE_URL}/banner`)
        .then(res => setBanners(Array.isArray(res.data) ? res.data.filter(b => b.active && b.image_url) : []))
        .catch(() => setBanners([]));
      setBannerIndex(0);
      return () => {
        if (bannerTimer.current) clearInterval(bannerTimer.current);
      };
    }, [])
  );

  // Auto-slide banners, pause if isBannerPaused is true
  useEffect(() => {
    if (banners.length > 1 && !isBannerPaused) {
      bannerTimer.current = setInterval(() => {
        setBannerIndex(prev => {
          const next = (prev + 1) % banners.length;
          if (bannerFlatListRef.current) {
            bannerFlatListRef.current.scrollToIndex({ index: next, animated: true });
          }
          return next;
        });
      }, 3000);
      return () => clearInterval(bannerTimer.current);
    } else {
      if (bannerTimer.current) clearInterval(bannerTimer.current);
    }
  }, [banners, isBannerPaused]);

  
  // Add/update a variant to cart and sync with backend
  const handleAddVariantToCart = (product, variant, quantity) => {
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

  // Open modal and initialize popupVariantQuantities from cart for this product
  const openVariantModal = (product) => {
    setModalProduct(product);
    const qtyObj = {};
    product.variants.forEach(variant => {
      const inCart = cart.find(
        item => item.product_id === product.id && item.variant_id === variant.id
      );
      qtyObj[variant.id] = inCart ? inCart.quantity : 0;
    });
    setPopupVariantQuantities(qtyObj);
    setModalVisible(true);
  };

  // Render product item
  const renderItem = ({ item }) => {
    const validVariants = Array.isArray(item.variants)
      ? item.variants.filter(v => v && v.id)
      : [];

    const onlyOneVariant = validVariants.length === 1;
    const variant = onlyOneVariant ? validVariants[0] : null;
    const qty = variant ? (variantQuantities[variant.id] || 0) : 0;
    const totalQty = validVariants.reduce((sum, v) => sum + (variantQuantities[v.id] || 0), 0);

    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/60' }}
          style={styles.productImage}
        />
        <View style={styles.infoColumn}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {/* Add this line for description */}
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {validVariants.length > 0 ? (
            <Text style={styles.price}>
              {validVariants[0].quantity_value} • ₹{Number(validVariants[0].price).toFixed(2)}
            </Text>
          ) : (
            <Text style={styles.price}>No variants</Text>
          )}
        </View>
        {onlyOneVariant ? (
          totalQty === 0 ? (
            <TouchableOpacity
              style={[styles.addButton, { paddingHorizontal: 30 }]}
              onPress={() => {
                handleAddVariantToCart(item, variant, 1);
                setVariantQuantities(prev => ({ ...prev, [variant.id]: 1 }));
              }}
            >
              <Text style={[styles.addButtonText]}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  if (qty > 1) {
                    handleAddVariantToCart(item, variant, qty - 1);
                    setVariantQuantities(prev => ({ ...prev, [variant.id]: qty - 1 }));
                  } else if (qty === 1) {
                    setCart(prevCart =>
                      prevCart.filter(
                        cartItem => !(cartItem.product_id === item.id && cartItem.variant_id === variant.id)
                      )
                    );
                    setVariantQuantities(prev => ({ ...prev, [variant.id]: 0 }));
                    if (loggedInUserId) {
                      axios.delete(`${API_BASE_URL}/cart`, {
                        data: {
                          user_id: loggedInUserId,
                          product_id: item.id,
                          variant_id: variant.id,
                        }
                      }).catch(() => {});
                    }
                  }
                }}
                style={{
                  backgroundColor: '#28a745',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold', minWidth: 10, textAlign: 'center' }}>
                {qty}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (qty < 5) {
                    handleAddVariantToCart(item, variant, qty + 1);
                    setVariantQuantities(prev => ({ ...prev, [variant.id]: qty + 1 }));
                  }
                }}
                style={{
                  backgroundColor: '#28a745',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )
        ) : (
          totalQty === 0 ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openVariantModal(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.addButtonText}>Add</Text>
                <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 2, marginTop: 4 }} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => openVariantModal(item)}
                style={{
                  backgroundColor: '#28a745',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold', minWidth: 10, textAlign: 'center' }}>
                {totalQty}
              </Text>
              <TouchableOpacity
                onPress={() => openVariantModal(item)}
                style={{
                  backgroundColor: '#28a745',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    );
  };

  // Modal for variants
  const renderVariantModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setModalVisible(false);
        syncVariantQuantitiesFromCart();
      }}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
      }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressOut={() => {
            setModalVisible(false);
            syncVariantQuantitiesFromCart();
          }}
          style={{ flex: 1 }}
        >
          <View style={{
            flex: 1,
            justifyContent: 'flex-end',
          }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{}}
              onPress={() => {}} // Prevent modal close when clicking inside
            >
              <View style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 16,
                maxHeight: '100%',
                position: 'relative',
              }}>
                {/* Cross Icon at the top center */}
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    syncVariantQuantitiesFromCart();
                  }}
                  style={{
                    position: 'absolute',
                    top: -60,
                    left: '50%',
                    marginLeft: -8,
                    zIndex: 10,
                    backgroundColor: '#aaa',
                    borderRadius: 28,
                    width: 50,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                  }}
                >
                  <Ionicons name="close" size={32} color="#f5f5f5" />
                </TouchableOpacity>

                {/* Product Image */}
                {modalProduct?.image_url && (
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Image
                      source={{ uri: modalProduct.image_url }}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 12,
                        marginBottom: 8,
                        backgroundColor: '#f2f2f2',
                      }}
                    />
                  </View>
                )}

                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, textAlign: 'center' }}>
                  {modalProduct?.name}
                </Text>

                {/* Make variants scrollable if too many */}
                <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 12 }}>
                  {modalProduct?.variants?.map((v, idx) => {
                    const qty = popupVariantQuantities[v.id] || 0;
                    return (
                      <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ flex: 2 }}>{v.quantity_value}</Text>
                        <Text style={{ flex: 2, textDecorationLine: v.mrp && v.mrp > v.price ? 'line-through' : 'none', color: '#888' }}>
                          {v.mrp && v.mrp > v.price ? `₹${v.mrp}` : ''}
                        </Text>
                        <Text style={{ flex: 2, fontWeight: 'bold', color: '#222' }}>₹{v.price}</Text>
                        {qty > 0 ? (
                          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                              onPress={() => {
                                if (qty > 1) {
                                  const nextQty = qty - 1;
                                  setPopupVariantQuantities(prev => ({ ...prev, [v.id]: nextQty }));
                                  handleAddVariantToCart(modalProduct, v, nextQty);
                                } else if (qty === 1) {
                                  setPopupVariantQuantities(prev => ({ ...prev, [v.id]: 0 }));
                                  setCart(prevCart =>
                                    prevCart.filter(
                                      item => !(item.product_id === modalProduct.id && item.variant_id === v.id)
                                    )
                                  );
                                  if (loggedInUserId) {
                                    axios.delete(`${API_BASE_URL}/cart`, {
                                      data: {
                                        user_id: loggedInUserId,
                                        product_id: modalProduct.id,
                                        variant_id: v.id,
                                      }
                                    }).catch(() => {});
                                  }
                                }
                              }}
                              style={{
                                backgroundColor: '#28a745',
                                borderRadius: 12,
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginHorizontal: 4,
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 18 }}>-</Text>
                            </TouchableOpacity>
                            <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 16 }}>{qty}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                if (qty < 5) {
                                  const nextQty = qty + 1;
                                  setPopupVariantQuantities(prev => ({ ...prev, [v.id]: nextQty }));
                                  handleAddVariantToCart(modalProduct, v, nextQty);
                                }
                              }}
                              disabled={qty >= 5}
                              style={{
                                backgroundColor: qty >= 5 ? '#ccc' : '#28a745',
                                borderRadius: 12,
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginHorizontal: 4,
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 18 }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addButton, { flex: 1 }]}
                            onPress={() => {
                              setPopupVariantQuantities(prev => ({ ...prev, [v.id]: 1 }));
                              handleAddVariantToCart(modalProduct, v, 1);
                            }}
                          >
                            <Text style={styles.addButtonText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // Show loading spinner until cart is loaded
  if (!cartLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading your cart...</Text>
      </View>
    );
  }

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
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 8 }} />
      </View>

      {/* Sliding Banner */}
      {banners.length > 0 && (
        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 8,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: '#fffbe6',
            borderWidth: 1,
            borderColor: '#ffe066',
            elevation: 2,
            // Set height to 16:9 aspect ratio based on screen width
            height: ((Dimensions.get('window').width - 24) * 7) / 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FlatList
            ref={bannerFlatListRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={1}
                onLongPress={() => setIsBannerPaused(true)}
                onPressOut={() => setIsBannerPaused(false)}
                delayLongPress={200}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={{
                    width: Dimensions.get('window').width - 24,
                    height: ((Dimensions.get('window').width - 24) * 7) / 16, // 16:9 aspect ratio
                    resizeMode: 'cover',
                  }}
                />
              </TouchableOpacity>
            )}
            onMomentumScrollEnd={e => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 24)
              );
              setBannerIndex(newIndex);
            }}
            initialScrollIndex={0}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width - 24,
              offset: (Dimensions.get('window').width - 24) * index,
              index,
            })}
          />
          {/* Dots indicator */}
          <View style={{ flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center' }}>
            {banners.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: bannerIndex === idx ? '#007bff' : '#ccc',
                  marginHorizontal: 3,
                }}
              />
            ))}
          </View>
        </View>
      )}

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
          ) : error ? (
            <Text style={{ textAlign: 'center', marginTop: 30, color: 'red' }}>{error}</Text>
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
      {renderVariantModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f2f2f2',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 0,
  },
   description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#555',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});