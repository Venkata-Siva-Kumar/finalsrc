import React, { useState ,useContext } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
} from 'react-native';
import axios from 'axios';
import { UserContext } from '../UserContext';

import { API_BASE_URL } from '../config';
 // Replace with your server IP

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [scaleValue] = useState(new Animated.Value(1));
  const { setUser } = useContext(UserContext);

  const handleLogin = async () => {
  if (!mobile || !password) {
    Alert.alert('Error', 'Please enter mobile number and password');
    return;
  }
  if (mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
    Alert.alert('Error', 'Check Mobile Number');
    return;
  }
  try {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      mobile,
      password,
    });

    const userRes = await axios.get(`${API_BASE_URL}/user?mobile=${mobile}`);
      // If your backend returns { user: {...} }
      const userData = userRes.data.user || userRes.data;

      setUser({
        id: userData.id,
        fname: userData.fname,
        lname: userData.lname,
        mobile: userData.mobile,
        email: userData.email,
        // ...add other fields if needed
      });

    
    navigation.replace('Main', { userMobile: userData.mobile }); // Pass mobile to Main

  } catch (error) {
    console.log(error);
    Alert.alert(
      'Login Failed',
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
    <View style={styles.container}>
      <Text style={styles.header}>Kirana Store App </Text>

      <TextInput
        style={[
          styles.input,
          focusedField === 'mobile' && styles.inputFocused
        ]}
        placeholder="Mobile Number"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={mobile}
        maxLength={10}
        onChangeText={setMobile}
        onFocus={() => setFocusedField('mobile')}
        onBlur={() => setFocusedField('')}
      />

      <TextInput
        style={[
          styles.input,
          focusedField === 'password' && styles.inputFocused
        ]}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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
          <Text style={styles.buttonText}>Login</Text>

        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.button}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => navigation.navigate('OTPLogin')}>
          <Text style={styles.buttonText}>Login with OTP</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.button}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={styles.buttonText}>Admin Login</Text>
        </TouchableOpacity>

      </Animated.View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>   
        
        {/* <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginLeft: 6 }} >
          <Text style={{ color: '#007aff', fontSize: 13, textDecorationLine: 'underline' }}>Forgot Password?</Text>
        </TouchableOpacity> */}

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginRight: 6 }}>
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    //marginTop: 150,
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
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007aff',
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
  link: {
    color: '#007aff',
    fontSize: 13,
    textAlign: 'center',
    textDecorationLine: 'underline',
    
  },
});