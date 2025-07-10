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
  ActivityIndicator,
  Platform,
  Modal
} from 'react-native';
import axios from 'axios';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../config';
import Ionicons from 'react-native-vector-icons/Ionicons';
const Tab = createMaterialTopTabNavigator();
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickAndCompressImage, formatDate, toApiDate } from '../admin/image_compress';
import { useFocusEffect } from '@react-navigation/native';
import AppHeaderIcon from './AppHeaderIcon';

// --- Cross-platform alert/popup utility with web modal fallback ---
function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    // If there are multiple options, show a custom modal
    if (buttons && buttons.length > 1) {
      // Create a simple modal using the DOM for web
      // Remove any existing modal
      const existing = document.getElementById('web-alert-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'web-alert-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.3)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '9999';

      const box = document.createElement('div');
      box.style.background = '#fff';
      box.style.borderRadius = '12px';
      box.style.padding = '24px';
      box.style.minWidth = '300px';
      box.style.maxWidth = '90vw';
      box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
      box.style.textAlign = 'center';

      if (title) {
        const titleEl = document.createElement('div');
        titleEl.style.fontWeight = 'bold';
        titleEl.style.fontSize = '18px';
        titleEl.style.marginBottom = '12px';
        titleEl.innerText = title;
        box.appendChild(titleEl);
      }
      if (message) {
        const msgEl = document.createElement('div');
        msgEl.style.marginBottom = '18px';
        msgEl.innerText = message;
        box.appendChild(msgEl);
      }

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.justifyContent = 'center';
      btnRow.style.gap = '12px';

      buttons.forEach((b, idx) => {
        const btn = document.createElement('button');
        btn.innerText = b.text;
        btn.style.padding = '10px 18px';
        btn.style.borderRadius = '6px';
        btn.style.border = 'none';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '15px';
        btn.style.background = b.style === 'destructive'
          ? '#ff3b30'
          : b.style === 'cancel'
          ? '#ccc'
          : '#007aff';
        btn.style.color = b.style === 'cancel' ? '#333' : '#fff';
        btn.onclick = async () => {
          document.body.removeChild(modal);
          if (b.onPress) await b.onPress();
        };
        btnRow.appendChild(btn);
      });

      box.appendChild(btnRow);
      modal.appendChild(box);
      document.body.appendChild(modal);
    } else {
      alert(`${title ? title + '\n' : ''}${message || ''}`);
      if (buttons && buttons[0] && buttons[0].onPress) buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

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
      showAlert('Error', 'Category name cannot be empty');
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/categories/${editCatId}`, { name: editCatName });
      setShowEditModal(false);
      setEditCatId(null);
      setEditCatName('');
      await fetchCategories();
      showAlert('Success', 'Category name updated!');
    } catch (err) {
      showAlert('Error', err?.response?.data?.error || 'Failed to update category name');
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
    showAlert(
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
      showAlert('Error', 'Category name and image are required');
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
      showAlert('Success', 'Category added!');
    } catch (err) {
      showAlert('Error', err?.response?.data?.error || 'Failed to add category');
    }
    setLoading(false);
  };

  const handleDeleteCategory = (catId) => {
    showAlert(
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
              showAlert('Success', 'Category deleted!');
            } catch (err) {
              showAlert('Error', err?.response?.data?.error || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // Use utility for editing category image
  const handleEditPhoto = (catId) => {
    showAlert(
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
                showAlert('Success', 'Category photo updated!');
              } catch (err) {
                showAlert('Error', err?.response?.data?.error || 'Failed to update photo');
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
                showAlert('Success', 'Category photo updated!');
              } catch (err) {
                showAlert('Error', err?.response?.data?.error || 'Failed to update photo');
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
  const [category_id, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [imageBase64, setImageBase64] = useState('');
  const [variants, setVariants] = useState([
    { quantity_value: '', price: '', mrp: '' }
  ]);

  useFocusEffect(
    React.useCallback(() => {
      axios
        .get(`${API_BASE_URL}/categories`)
        .then((res) => setCategories(res.data))
        .catch(() => setCategories([]));
    }, [])
  );

  // Use utility for picking product image
  const pickImageFromGallery = async () => {
    const base64 = await pickAndCompressImage('gallery', 600, 0.1);
    if (base64) {
      setImageBase64(base64);
      showAlert('Image ready', 'Image uploaded and compressed!');
    }
  };

  const pickImage = async () => {
    const base64 = await pickAndCompressImage('camera', 600, 0.1);
    if (base64) {
      setImageBase64(base64);
      showAlert('Image ready', 'Image captured and compressed!');
    }
  };

  const addVariant = () => {
    setVariants([...variants, { quantity_value: '', price: '', mrp: '' }]);
  };

  const updateVariant = (idx, key, value) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  };

  const removeVariant = (idx) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleAddProduct = async () => {
    // Filter out empty/incomplete variants
    const validVariants = variants.filter(
      v => v.quantity_value && v.price // add more checks if needed (e.g., v.mrp)
    );

    if (!name.trim() || !category_id || !validVariants.length || !imageBase64) {
      showAlert('Error', 'Fill all fields and add atleast one variant');
      return;
    }
    try {
      const prodRes = await axios.post(`${API_BASE_URL}/products`, {
        name,
        description,
        category_id: Number(category_id),
        variants: validVariants,
      });
      const product_id = prodRes.data.id;
      await axios.post(`${API_BASE_URL}/images`, {
        product_id,
        image_base64: imageBase64,
        mime_type: 'image/jpeg',
      });
      showAlert('Success', 'Product and image added!');
      setName('');
      setDescription('');
      setCategoryId('');
      setImageBase64('');
      setVariants([{ quantity_value: '', price: '', mrp: '' }]);
      if (onProductAdded) onProductAdded();
    } catch (err) {
      showAlert('Error', 'Product name already exists or failed to add product');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.labelName}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Product Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
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
          selectedValue={category_id}
          onValueChange={(itemValue) => setCategoryId(itemValue)}
          style={{ color: 'black' }}
        >
          <Picker.Item label="Select Category" value="" />
          {categories.map((cat, idx) => (
            <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
          ))}
        </Picker>
      </View>
      <Text style={styles.labelName}>Variants</Text>
      {variants.map((v, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Qty(gms/ml)"
            placeholderTextColor="#888"
            value={v.quantity_value}
            onChangeText={text => updateVariant(idx, 'quantity_value', text)}
            
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 5 }]}
            placeholder="Price"
            placeholderTextColor="#888"
            value={v.price}
            onChangeText={text => updateVariant(idx, 'price', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 5 }]}
            placeholder="MRP (optional)"
            placeholderTextColor="#888"
            value={v.mrp}
            onChangeText={text => updateVariant(idx, 'mrp', text)}
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={() => removeVariant(idx)} style={{ marginLeft: 5 }}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addVariant} style={[styles.button, { marginBottom: 12 }]}>
        <Text style={styles.buttonText}>Add Variant</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity style={[styles.button, { flex: 1, marginRight: 6 }]} onPress={pickImage} >
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1, marginLeft: 6 }]} onPress={pickImageFromGallery}>
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
  const [editVariants, setEditVariants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescription, setEditDescription] = useState('');

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
      showAlert('Error', 'Failed to update product status');
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
    showAlert(
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
                showAlert('Success', 'Product image updated!');
                refreshProducts();
              } catch (err) {
                showAlert('Error', err?.response?.data?.error || 'Failed to update product image');
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
                showAlert('Success', 'Product image updated!');
                refreshProducts();
              } catch (err) {
                showAlert('Error', err?.response?.data?.error || 'Failed to update product image');
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
    setEditVariants(product.variants || []);
    setEditCategoryId(product.category_id ? String(product.category_id) : '');
    setEditDescription(product.description || '');
    setEditModalVisible(true);
  };

  const updateEditVariant = (idx, key, value) => {
    setEditVariants(editVariants.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  };

  const addEditVariant = () => {
    setEditVariants([...editVariants, { quantity_value: '', price: '', mrp: '' }]);
  };

  const removeEditVariant = (idx) => {
    setEditVariants(editVariants.filter((_, i) => i !== idx));
  };

  const saveEdit = async () => {
    const validVariants = editVariants.filter(
      v => v.quantity_value && v.price
    );

    if (!editName.trim() || !validVariants.length) {
      showAlert('Error', 'Enter valid name and at least one variant');
      return;
    }
    setLoadingId('edit' + editProduct.id);
    try {
      await axios.put(`${API_BASE_URL}/products/${editProduct.id}`, {
        name: editName,
        variants: validVariants,
        description: editDescription,
        category_id: editCategoryId,
      });
      setEditModalVisible(false);
      setEditProduct(null);
      refreshProducts();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update product';
      if (msg.toLowerCase().includes('already exists')) {
        showAlert('Error', 'A product with this name already exists. Please choose a different name.');
      } else {
        showAlert('Already Exists', 'A product with the same name already exists. Please choose a different name.');
      }
    }
    setLoadingId(null);
  };

  const removeProduct = (productId) => {
    showAlert(
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
              showAlert('Error', err?.response?.data?.error || 'Failed to remove product');
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.name, { flex: 1, flexWrap: 'wrap', flexShrink: 1 }]}>{item.name}</Text>
                  {/* Buttons in a column at the right of the name */}
                  <View style={{ flexDirection: 'column', marginLeft: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: item.status === 'enabled' ? '#28a745' : '#dc3545',
                          paddingVertical: 6,
                          paddingHorizontal: 16,
                          marginBottom: 8,
                          width: 110,
                        },
                      ]}
                      onPress={() =>
                        updateStatus(item.id, item.status === 'enabled' ? 'disabled' : 'enabled')
                      }
                      disabled={loadingId === item.id}
                    >
                      <Text style={styles.buttonText}>
                        {item.status === 'enabled' ? 'Enabled' : 'Disabled'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: '#007aff', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8, width: 110 }
                      ]}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: '#ff3b30', paddingVertical: 6, paddingHorizontal: 12, width: 110 }
                      ]}
                      onPress={() => removeProduct(item.id)}
                    >
                      <Text style={styles.buttonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* You can add more product info below if needed */}
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
            <Text style={styles.labelName}>Variants</Text>
            {editVariants.map((v, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Qty"
                  placeholderTextColor="#888"
                  value={v.quantity_value}
                  onChangeText={text => updateEditVariant(idx, 'quantity_value', text)}
                  
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 5 }]}
                  placeholder="Price"
                  placeholderTextColor="#888"
                  value={v.price}
                  onChangeText={text => updateEditVariant(idx, 'price', text)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 5 }]}
                  placeholder="MRP (optional)"
                  placeholderTextColor="#888"
                  value={v.mrp}
                  onChangeText={text => updateEditVariant(idx, 'mrp', text)}
                  keyboardType="numeric"
                />
                <TouchableOpacity onPress={() => removeEditVariant(idx)} style={{ marginLeft: 5 }}>
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={addEditVariant} style={[styles.button, { marginBottom: 12 }]}>
              <Text style={styles.buttonText}>Add Variant</Text>
            </TouchableOpacity>
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

  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.final_amount || 0), 0);


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
        Total Collection: <Text style={{ color: '#28a745' }}>₹{Number(totalEarnings).toFixed(2)}</Text>
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
        {Platform.OS === 'web' ? (
          <>
            <input
              type="date"
              style={{
                flex: 1,
                marginRight: 8,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ccc',
                fontSize: 15,
                backgroundColor: '#fff',
              }}
              value={fromDate}
              max={toDate || undefined}
              min={toApiDate(minDate)}
              onChange={e => setFromDate(e.target.value)}
            />
            <input
              type="date"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ccc',
                fontSize: 15,
                backgroundColor: '#fff',
              }}
              value={toDate}
              min={fromDate || toApiDate(minDate)}
              max={toApiDate(today)}
              onChange={e => setToDate(e.target.value)}
            />
          </>
        ) : (
          <>
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
          </>
        )}
        <TouchableOpacity style={[styles.button, { marginLeft: 8, padding: 10 }]} onPress={fetchEarnings}>
          <Text style={styles.buttonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      {/* Only show DateTimePicker on native */}
      {Platform.OS !== 'web' && showFromPicker && (
        <DateTimePicker
          value={fromDate ? new Date(fromDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleFromDateChange}
          minimumDate={minDate}
          maximumDate={today}
        />
      )}
      {Platform.OS !== 'web' && showToPicker && (
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
              <Text style={{ color: '#28a745', fontWeight: 'bold' }}>Earnings: ₹{item.final_amount}</Text>
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
      .catch(() => showAlert('Error', 'Failed to load products'));
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            showAlert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: () => navigation.replace('AdminLogin'),
                },
              ]
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
    fontSize: 15,
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