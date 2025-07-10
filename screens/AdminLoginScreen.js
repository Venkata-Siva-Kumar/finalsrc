import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    alert(title ? `${title}\n${message || ''}` : message);
  } else {
    Alert.alert(title, message);
  }
}

export default function AdminLoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [scaleValue] = useState(new Animated.Value(1));
  const [showPassword, setShowPassword] = useState(false);

  // Password login (existing)
  const handleLogin = async () => {
    if (!mobile || !password) {
      showAlert('Error', 'Please enter admin mobile number and password');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      showAlert('Error', 'Admin mobile number must be exactly 10 digits');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/admin-login`, {
        mobile,
        password,
      });

      // Save admin login state
      await AsyncStorage.setItem('isAdmin', 'true');
      await AsyncStorage.setItem('admin', JSON.stringify({ mobile }));

      navigation.replace('AdminMainTabs', { mobile });
    } catch (error) {
      showAlert(
        'Admin Login Failed',
        error.response?.data?.message || 'Something went wrong'
      );
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    Platform.OS === 'web' ? (
      <View style={styles.container}>
        <Text style={styles.header}>Admin Login 🧑‍💼</Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'mobile' && styles.inputFocused
          ]}
          placeholder="Admin Mobile Number"
          maxLength={10}
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
          onFocus={() => setFocusedField('mobile')}
          onBlur={() => setFocusedField('')}
        />
        <TextInput
          style={[
            styles.input,
            focusedField === 'password' && styles.inputFocused,
          ]}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField('')}
        />
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <TouchableOpacity
            style={styles.button}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Login as Admin</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    ) : (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Text style={styles.header}>Admin Login 🧑‍💼</Text>
          <TextInput
            style={[
              styles.input,
              focusedField === 'mobile' && styles.inputFocused
            ]}
            placeholder="Admin Mobile Number"
            maxLength={10}
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
            onFocus={() => setFocusedField('mobile')}
            onBlur={() => setFocusedField('')}
          />
          <TextInput
            style={[
              styles.input,
              focusedField === 'password' && styles.inputFocused,
            ]}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField('')}
          />
          <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity
              style={styles.button}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleLogin}
            >
              <Text style={styles.buttonText}>Login as Admin</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3f9',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  inputFocused: {
    borderColor: '#007aff',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  button: {
    backgroundColor: '#ff9500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 0,
    paddingRight: 0,
  },
  passwordInput: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  required: {
    color: '#ff3b30',
  },
});