import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Modal } from 'react-native'; 
const Tab = createMaterialTopTabNavigator();
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickAndCompressImage, formatDate, toApiDate } from '../admin/image_compress';
import { useFocusEffect } from '@react-navigation/native';


function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editCatId, setEditCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const openEditNameModal = (cat) => {
    setEditCatId(cat.id);
    setEditCatName(cat.name);
    setShowEditModal(true);
  };
  const saveEditCatName = async () => {
    if (!editCatName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/categories/${editCatId}`, { name: editCatName });
      setShowEditModal(false);
      setEditCatId(null);
      setEditCatName('');
      await fetchCategories();
      Alert.alert('Success', 'Category name updated!');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update category name');
    }
  };
  
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(res.data);
    } catch {
      setCategories([]);
    }
  };

  React.useEffect(() => {
    fetchCategories();
  }, []);

  // Use utility for picking category image
  const pickCategoryImage = () => {
    Alert.alert(
      'Select Image',
      'Choose an option to add a category image:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Gallery',
          onPress: async () => {
            const base64 = await pickAndCompressImage('gallery', 100, 0.1);
            if (base64) setNewCatImage(base64);
          },
        },
        {
          text: 'Camera',
          onPress: async () => {
            const base64 = await pickAndCompressImage('camera', 100, 0.1);
            if (base64) setNewCatImage(base64);
          },
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatImage) {
      Alert.alert('Error', 'Category name and image are required');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/categories`, {
        name: newCatName,
        image_base64: newCatImage,
      });
      setNewCatName('');
      setNewCatImage('');
      await fetchCategories();
      Alert.alert('Success', 'Category added!');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add category');
    }
    setLoading(false);
  };

  const handleDeleteCategory = (catId) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/categories/${catId}`);
              await fetchCategories();
              Alert.alert('Success', 'Category deleted!');
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // Use utility for editing category image
  const handleEditPhoto = (catId) => {
    Alert.alert(
      'Change Category Image',
      'Choose an option to update the category image:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Gallery',
          onPress: async () => {
            const base64 = await pickAndCompressImage('gallery', 600, 0.9);
            if (base64) {
              try {
                await axios.put(`${API_BASE_URL}/categories/${catId}/image`, {
                  image_base64: base64,
                });
                await fetchCategories();
                Alert.alert('Success', 'Category photo updated!');
              } catch (err) {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to update photo');
              }
            }
          },
        },
        {
          text: 'Camera',
          onPress: async () => {
            const base64 = await pickAndCompressImage('camera', 600, 0.9);
            if (base64) {
              try {
                await axios.put(`${API_BASE_URL}/categories/${catId}/image`, {
                  image_base64: base64,
                });
                await fetchCategories();
                Alert.alert('Success', 'Category photo updated!');
              } catch (err) {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to update photo');
              }
            }
          },
        },
      ]
    );
  };

  return (
    <>
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={categories}
      keyExtractor={item => item.id?.toString() || item.name}
      ListHeaderComponent={
        <>
          <Text style={styles.labelName}>Category Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Category Name"
            placeholderTextColor="#888"
            value={newCatName}
            onChangeText={setNewCatName}
          />
          <TouchableOpacity style={styles.button} onPress={pickCategoryImage}>
            <Text style={styles.buttonText}>{newCatImage ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>
          {newCatImage ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${newCatImage}` }}
              style={{ width: 100, height: 100, borderRadius: 10, alignSelf: 'center', marginBottom: 12 }}
            />
          ) : null}
          <TouchableOpacity style={styles.button} onPress={handleAddCategory} disabled={loading}>
            <Text style={styles.buttonText}>Add Category</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeader, { marginTop: 20 }]}>Existing Categories</Text>
        </>
      }
      renderItem={({ item }) => (
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <Image
              source={{
                uri: item.image_url
                  ? item.image_url
                  : 'https://via.placeholder.com/60'
              }}
              style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
            />
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditNameModal(item)}>
              <Text style={{ fontSize: 16, backgroundColor: '#e6f0ff', borderBottomWidth: 2, borderBottomColor: '#007aff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, color: '#007aff', fontWeight: 'bold', alignSelf: 'flex-start', }}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEditPhoto(item.id)}>
              <Ionicons name="pencil" size={32} color="#007aff" />
              <Text style={{ fontSize: 12, color: '#007aff' }}>Edit Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteCategory(item.id)}
              style={{ marginLeft: 12, alignItems: 'center' }}
            >
              <Ionicons name="trash" size={32} color="#ff3b30" />
              <Text style={{ fontSize: 12, color: '#ff3b30' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No categories found.</Text>}
    />

    <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            width: '85%',
            elevation: 5,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Edit Category Name</Text>
            <TextInput
              style={styles.input}
              value={editCatName}
              onChangeText={setEditCatName}
              placeholder="Category Name"
              placeholderTextColor="#888"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#007aff', marginRight: 8, paddingVertical: 10, paddingHorizontal: 18 }]}
                onPress={saveEditCatName}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#ccc', paddingVertical: 10, paddingHorizontal: 18 }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function AddProductTab({ onProductAdded }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [imageBase64, setImageBase64] = useState('');

  React.useEffect(() => {
    axios
      .get(`${API_BASE_URL}/categories`)
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  // Use utility for picking product image
  const pickImageFromGallery = async () => {
    const base64 = await pickAndCompressImage('gallery', 600, 0.1);
    if (base64) {
      setImageBase64(base64);
      Alert.alert('Image ready', 'Image uploaded and compressed!');
    }
  };

  const pickImage = async () => {
    const base64 = await pickAndCompressImage('camera', 600, 0.1);
    if (base64) {
      setImageBase64(base64);
      Alert.alert('Image ready', 'Image captured and compressed!');
    }
  };

  const handleAddProduct = async () => {
    if (!name.trim() || !price.trim() || !category.trim()) {
      Alert.alert('Error', 'Name, price and category are required');
      return;
    }
    if (!imageBase64) {
      Alert.alert('Error', 'Please take a product photo');
      return;
    }
    try {
      const prodRes = await axios.post(`${API_BASE_URL}/products`, {
        name,
        price,
        description,
        category,
      });
      const product_id = prodRes.data.id;

      await axios.post(`${API_BASE_URL}/images`, {
        product_id,
        image_base64: imageBase64,
        mime_type: 'image/jpeg',
      });

      Alert.alert('Success', 'Product and image added!');
      setName('');
      setPrice('');
      setDescription('');
      setImageBase64('');
      setCategory('');
      if (onProductAdded) onProductAdded();
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('Duplicate Product', 'A product with this name already exists.');
      } else {
        Alert.alert('Error', err?.response?.data?.error || err.message || 'Failed to add product or image');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 30, paddingLeft: 16, paddingRight: 16 }}>
      <Text style={styles.labelName}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Product Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.labelPrice}>Price</Text>
      <TextInput
        style={styles.input}
        placeholder="Price"
        placeholderTextColor="#888"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <Text style={styles.labelDescription}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor="#888"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Text style={styles.labelCategory}>Category</Text>
      <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, backgroundColor: '#fff' }}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
          style={{ color: 'black' }}
        >
          <Picker.Item label="Select Category" value="" />
          {categories.map((cat, idx) => {
            const label = typeof cat === 'string' ? cat : cat.name;
            return <Picker.Item key={label || idx} label={label} value={label} />;
          })}
        </Picker>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#888', flex: 1, marginRight: 6 }]} onPress={pickImage} >
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#888', flex: 1, marginLeft: 6 }]} onPress={pickImageFromGallery}>
          <Text style={styles.buttonText}>Upload Photo</Text>
        </TouchableOpacity>
      </View>
      {imageBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
          style={{ width: 160, height: 160, borderRadius: 10, alignSelf: 'center', marginBottom: 12 }}
        />
      ) : null}
      {imageBase64 ? (
        <Text style={{ marginBottom: 12, color: 'green', textAlign: 'center' }}>Image ready for upload!</Text>
      ) : null}
      <TouchableOpacity style={styles.button} onPress={handleAddProduct}>
        <Text style={styles.buttonText}>Add Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CurrentProductsTab({ products, refreshProducts, setProducts }) {
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Optimistic status update
  const updateStatus = async (id, status) => {
    setProducts(prev =>
      prev.map(prod =>
        prod.id === id ? { ...prod, status } : prod
      )
    );
    setLoadingId(id);
    try {
      await axios.put(`${API_BASE_URL}/products/${id}/status`, { status });
    } catch (err) {
      Alert.alert('Error', 'Failed to update product status');
      setProducts(prev =>
        prev.map(prod =>
          prod.id === id ? { ...prod, status: status === 'enabled' ? 'disabled' : 'enabled' } : prod
        )
      );
    }
    setLoadingId(null);
  };

  // Use utility for changing product image
  const askImageChange = (productId) => {
    Alert.alert(
      'Change Product Image',
      'Choose an option to update the product image:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const base64 = await pickAndCompressImage('camera', 600, 0.1);
            if (base64) {
              try {
                await axios.post(`${API_BASE_URL}/images`, {
                  product_id: productId,
                  image_base64: base64,
                  mime_type: 'image/jpeg',
                });
                Alert.alert('Success', 'Product image updated!');
                refreshProducts();
              } catch (err) {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to update product image');
              }
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const base64 = await pickAndCompressImage('gallery', 600, 0.1);
            if (base64) {
              try {
                await axios.post(`${API_BASE_URL}/images`, {
                  product_id: productId,
                  image_base64: base64,
                  mime_type: 'image/jpeg',
                });
                Alert.alert('Success', 'Product image updated!');
                refreshProducts();
              } catch (err) {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to update product image');
              }
            }
          },
        },
      ]
    );
  };

  const openEditModal = (product) => {
    setEditProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editPrice.trim() || isNaN(editPrice)) {
      Alert.alert('Error', 'Enter valid name and price');
      return;
    }
    setLoadingId('edit' + editProduct.id);
    try {
      await axios.put(`${API_BASE_URL}/products/${editProduct.id}`, {
        name: editName,
        price: editPrice,
      });
      setEditModalVisible(false);
      setEditProduct(null);
      refreshProducts();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update product');
    }
    setLoadingId(null);
  };

  const removeProduct = (productId) => {
    Alert.alert(
      'Remove Product',
      'Are you sure you want to remove this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoadingId('remove' + productId);
            try {
              await axios.delete(`${API_BASE_URL}/products/${productId}`);
              refreshProducts();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to remove product');
            }
            setLoadingId(null);
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
      {/* Search Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
        backgroundColor: '#fff',
        height: 40,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 16 }}
          placeholder="Search products..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 8 }} />
      </View>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => askImageChange(item.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri:
                        item.image_url && item.image_url !== 'NULL'
                          ? item.image_url
                          : 'https://via.placeholder.com/100',
                    }}
                    style={styles.image}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₹{item.price}</Text>
                {item.description ? (
                  <Text style={styles.description}>{item.description}</Text>
                ) : null}
                {/* Enable/Disable Toggle Button */}
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: item.status === 'enabled' ? '#28a745' : '#dc3545',
                        paddingVertical: 6,
                        paddingHorizontal: 16,
                      },
                    ]}
                    onPress={() =>
                      updateStatus(item.id, item.status === 'enabled' ? 'disabled' : 'enabled')
                    }
                    disabled={loadingId === item.id}  >
                    <Text style={styles.buttonText}>
                      {item.status === 'enabled' ? 'Enabled' : 'Disabled'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: '#007aff', marginLeft: 8, paddingVertical: 6, paddingHorizontal: 12 }
                    ]}
                    onPress={() => openEditModal(item)}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: '#ff3b30', marginLeft: 8, paddingVertical: 6, paddingHorizontal: 12 }
                    ]}
                    onPress={() => removeProduct(item.id)}
                  >
                    <Text style={styles.buttonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No products found.</Text>}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* Edit Modal */}
      {editModalVisible && (
        <View style={{
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            width: '85%',
            elevation: 5,
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Edit Product</Text>
            <Text style={styles.labelName}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Product Name"
              placeholderTextColor="#888"
            />
            <Text style={styles.labelPrice}>Price</Text>
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="Price"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#007aff', marginRight: 8, paddingVertical: 10, paddingHorizontal: 18 }]}
                onPress={saveEdit}
                disabled={loadingId === 'edit' + (editProduct?.id || '')}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#ccc', paddingVertical: 10, paddingHorizontal: 18 }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function EarningsTab() {
  const [earnings, setEarnings] = React.useState([]);
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());

  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.total || 0), 0);


  useFocusEffect(
    React.useCallback(() => {
      setFromDate('');
      setToDate('');
      setShowFromPicker(false);
      setShowToPicker(false);
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      fetchEarnings();
    }, [fromDate, toDate])
  );


  const handleFromDateChange = (_, selectedDate) => {
    setShowFromPicker(false);
    if (selectedDate) setFromDate(toApiDate(selectedDate));
  };
  const handleToDateChange = (_, selectedDate) => {
    setShowToPicker(false);
    if (selectedDate) setToDate(toApiDate(selectedDate));
  };

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/earnings`;
      if (fromDate || toDate) {
        url += `?${fromDate ? `from=${toApiDate(fromDate)}` : ''}${fromDate && toDate ? '&' : ''}${toDate ? `to=${toApiDate(toDate)}` : ''}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setEarnings(data);
    } catch {
      setEarnings([]);
    }
    setLoading(false);
  };

  return (
  <View style={{ flex: 1, padding: 16 }}>
    <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 20 }}>
      Total Earnings: <Text style={{ color: '#28a745' }}>₹{totalEarnings}</Text>
    </Text>
    {/* Add From Date and To Date labels above the input fields */}
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{ fontSize: 17, color: '#333', marginBottom: 2,marginLeft:10 }}>From</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, color: '#333', marginBottom: 2,marginLeft:10 }}>To</Text>
      </View>
      <View style={{ width: 80 }} />
    </View>
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <TouchableOpacity
        style={[styles.input, { flex: 1, marginRight: 8, justifyContent: 'center' }]}
        onPress={() => setShowFromPicker(true)}
      >
        <Text style={{ color: fromDate ? '#333' : '#888' }}>
          {fromDate ? formatDate(fromDate) : 'dd-mm-yyyy'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.input, { flex: 1, justifyContent: 'center' }]}
        onPress={() => setShowToPicker(true)}
      >
        <Text style={{ color: toDate ? '#333' : '#888' }}>
          {toDate ? formatDate(toDate) : 'dd-mm-yyyy'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { marginLeft: 8, padding: 10 }]} onPress={fetchEarnings}>
        <Text style={styles.buttonText}>Filter</Text>
      </TouchableOpacity>
    </View>
    {showFromPicker && (
      <DateTimePicker
        value={fromDate ? new Date(fromDate) : new Date()}
        mode="date"
        display="default"
        onChange={handleFromDateChange}
        minimumDate={minDate} 
        maximumDate={today}
      />
    )}
    {showToPicker && (
      <DateTimePicker
        value={toDate ? new Date(toDate) : new Date()}
        mode="date"
        display="default"
        onChange={handleToDateChange}
        minimumDate={minDate} 
        maximumDate={today}
        
      />
    )}
    {loading ? (
      <ActivityIndicator size="large" color="#007aff" />
    ) : (
      <FlatList
        data={earnings}
        keyExtractor={item => item.date}
        renderItem={({ item }) => (
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold' }}>
              Date: {formatDate(item.date)}
            </Text>
            <Text style={{ color: '#28a745', fontWeight: 'bold' }}>Earnings: ₹{item.total}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No earnings found.</Text>}
      />
    )}
  </View>
);
}

function AdminHomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);

  const refreshProducts = useCallback(() => {
    axios
      .get(`${API_BASE_URL}/products`)
      .then((res) => setProducts(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load products'));
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Admin',
      headerTitleStyle: { fontWeight: 'bold', fontSize: 30 },
      headerLeft: () => "",
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: () => navigation.replace('AdminLogin'),
                },
              ],
              { cancelable: true }
            );
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ color: '#ff3b30', fontWeight: 'bold', fontSize: 16, paddingRight: 4 }}>
            Logout
          </Text>
          <Ionicons name="log-out-outline" size={22} color="#ff3b30" style={{ paddingRight: 16 }} />
        </TouchableOpacity>
      ),
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  React.useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  return (
    <Tab.Navigator>
      <Tab.Screen name="Manage Categories" component={CategoryManager} />
      <Tab.Screen name="Add Product">
        {() => <AddProductTab onProductAdded={refreshProducts} />}
      </Tab.Screen>
      <Tab.Screen name="Current Products">
        {() => <CurrentProductsTab products={products} refreshProducts={refreshProducts} setProducts={setProducts} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0f0f0' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007aff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  infoColumn: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  price: {
    color: '#007aff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  labelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    marginLeft: 10,
  },
  labelPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 10,
  },
  labelDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 10,
  },
  labelCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 10,
  },
});

export default AdminHomeScreen;
export { EarningsTab };