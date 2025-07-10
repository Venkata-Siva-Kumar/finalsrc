import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Platform, Dimensions } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';

// --- Web Modal for Action Sheet ---
function WebModal({ visible, title, message, actions }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.18)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, minWidth: 340, boxShadow: '0 2px 24px #0002', textAlign: 'center'
      }}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 17, marginBottom: 22 }}>{message}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onPress}
              style={{
                minWidth: 90,
                padding: '10px 0',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 17,
                background: a.style === 'cancel' ? '#e0e0e0' : '#1677ff',
                color: a.style === 'cancel' ? '#444' : '#fff',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.2s'
              }}
            >
              {a.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- BannerTab component ---
export default function BannerTab() {
  const [banners, setBanners] = useState([]);
  const [image, setImage] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // For web modal
  const [webModal, setWebModal] = useState({ visible: false, title: '', message: '', actions: [] });

  // Helper for cross-platform alert/action sheet
  function showAlert(title, message, actions) {
    if (Platform.OS === 'web' && actions && actions.length > 1) {
      setWebModal({ visible: true, title, message, actions: actions.map(a => ({
        ...a,
        onPress: () => {
          setWebModal(m => ({ ...m, visible: false }));
          if (a.onPress) a.onPress();
        }
      })) });
    } else if (Platform.OS === 'web') {
      window.alert(`${title ? title + '\n' : ''}${message || ''}`);
      if (actions && actions[0] && actions[0].onPress) actions[0].onPress();
    } else {
      Alert.alert(title, message, actions);
    }
  }

  const fetchBanners = async () => {
    setUploading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/banner-admin`);
      setBanners(Array.isArray(res.data) ? res.data : []);
      setImage('');
    } catch {
      setBanners([]);
      setImage('');
    }
    setUploading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  // Pick and compress image (gallery or camera), keep 16:7 aspect ratio
  const pickBannerImage = async () => {
    showAlert(
      'Select Image',
      'Choose an option to add a category image:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Gallery',
          onPress: async () => {
            let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
              showAlert('Permission required', 'Gallery permission is required to upload a photo.');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [16, 7],
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0].uri) {
              const manipResult = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 1280, height: 560 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
              );
              setImage(manipResult.base64);
            }
          },
        },
        {
          text: 'Camera',
          onPress: async () => {
            let permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
              showAlert('Permission required', 'Camera permission is required to take a photo.');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [16, 7],
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0].uri) {
              const manipResult = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 1280, height: 560 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
              );
              setImage(manipResult.base64);
            }
          },
        },
      ]
    );
  };

  const uploadBanner = async () => {
    if (!image) {
      showAlert('Please select an image');
      return;
    }
    setUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/banner`, {
        image_base64: image,
        mime_type: 'image/jpeg',
      });
      showAlert('Banner uploaded!');
      fetchBanners();
    } catch {
      showAlert('Error uploading banner');
    }
    setUploading(false);
  };

  const activateBanner = async (id) => {
    showAlert(
      'Activate Banner',
      'Are you sure you want to activate this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'default',
          onPress: async () => {
            setLoadingId(id);
            try {
              await axios.put(`${API_BASE_URL}/banner/${id}/activate`);
              fetchBanners();
            } catch {
              showAlert('Error', 'Error activating banner');
            }
            setLoadingId(null);
          },
        },
      ]
    );
  };

  const deactivateBanner = async (id) => {
    showAlert(
      'Deactivate Banner',
      'Are you sure you want to deactivate this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setLoadingId(id);
            try {
              await axios.put(`${API_BASE_URL}/banner/${id}/deactivate`);
              fetchBanners();
            } catch {
              showAlert('Error', 'Error deactivating banner');
            }
            setLoadingId(null);
          },
        },
      ]
    );
  };

  const removeBanner = async (id) => {
    showAlert(
      'Remove Banner',
      'Are you sure you want to remove this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoadingId(id);
            try {
              await axios.delete(`${API_BASE_URL}/banner/${id}`);
              fetchBanners();
            } catch {
              showAlert('Error', 'Error removing banner');
            }
            setLoadingId(null);
          }
        }
      ]
    );
  };

  // Get screen width for responsive banners
  const screenWidth = Dimensions.get('window').width - 32; // 16 padding left + right
  const bannerAspectRatio = 16 / 7; // Changed from 16/9 to 16/7
  const bannerHeight = Math.round(screenWidth / bannerAspectRatio);

  return (
    <>
      {Platform.OS === 'web' && <WebModal {...webModal} />}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Offer Banners</Text>
        {uploading && <ActivityIndicator size="small" color="#007bff" />}
        {/* Show selected image above the upload button */}
        {image ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${image}` }}
            style={{
              width: screenWidth,
              height: bannerHeight,
              borderRadius: 10,
              marginBottom: 12,
              alignSelf: 'center',
            }}
          />
        ) : null}
        <TouchableOpacity
          style={{
            backgroundColor: '#0000ff',
            borderRadius: 8,
            padding: 13,
            marginBottom: 10,
            alignItems: 'center',
          }}
          onPress={pickBannerImage}
          disabled={uploading}
        >
          <Text style={{ fontSize: 16, fontWeight:'bold',color: '#ffffff' }}>{image ? 'Change Banner Image' : 'Upload Banner Image'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: '#28a745',
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            alignItems: 'center',
            opacity: uploading ? 0.6 : 1,
          }}
          onPress={uploadBanner}
          disabled={uploading}
        >
          <Text style={{ fontSize: 16,color: '#fff', fontWeight: 'bold' }}>Save Banner</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginVertical: 10 }}>All Banners</Text>
        {banners.length === 0 && <Text>No banners uploaded yet.</Text>}
        {banners.map((banner) => (
          <View key={banner.id} style={{ marginBottom: 18, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 8 }}>
            <Image
              source={{ uri: banner.image_url }}
              style={{
                width: screenWidth,
                height: bannerHeight,
                borderRadius: 10,
                marginBottom: 8,
                alignSelf: 'center',
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: banner.active ? '#d3d3d3' : '#28a745',
                  borderRadius: 8,
                  padding: 10,
                  flex: 1,
                  alignItems: 'center',
                  marginRight: 8,
                  opacity: loadingId === banner.id ? 0.6 : 1,
                }}
                onPress={() => activateBanner(banner.id)}
                disabled={banner.active || loadingId === banner.id || uploading}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: !banner.active ? '#d3d3d3' : '#ff3b30',
                  borderRadius: 8,
                  padding: 10,
                  flex: 1,
                  alignItems: 'center',
                  marginLeft: 8,
                  opacity: loadingId === banner.id ? 0.6 : 1,
                }}
                onPress={() => deactivateBanner(banner.id)}
                disabled={!banner.active || loadingId === banner.id || uploading}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Deactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#0000FF',
                  borderRadius: 8,
                  padding: 10,
                  flex: 1,
                  alignItems: 'center',
                  marginLeft: 8,
                  opacity: loadingId === banner.id ? 0.6 : 1,
                }}
                onPress={() => removeBanner(banner.id)}
                disabled={loadingId === banner.id || uploading}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}