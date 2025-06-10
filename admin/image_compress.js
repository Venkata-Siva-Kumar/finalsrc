import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Pick image from camera or gallery, compress and return base64
export async function pickAndCompressImage(type = 'gallery', resizeWidth = 600, compress = 0.1) {
  let permissionResult, result;
  if (type === 'camera') {
    permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take a photo.');
      return null;
    }
    result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: compress,
      base64: true,
    });
  } else {
    permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission required', 'Gallery permission is required to upload a photo.');
      return null;
    }
    result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: compress,
      base64: true,
    });
  }
  if (!result.canceled && result.assets && result.assets[0].uri) {
    const manipResult = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: resizeWidth } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return manipResult.base64;
  }
  return null;
}

// Format date as DD-MM-YYYY
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format date as YYYY-MM-DD for API
export function toApiDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}