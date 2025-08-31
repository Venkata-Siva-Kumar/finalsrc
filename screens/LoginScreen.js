import React, { useState, useContext, useRef } from 'react';
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import axios from 'axios';
import { UserContext } from '../UserContext';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  // const [password, setPassword] = useState(''); // Commented out for OTP login
  const [focusedField, setFocusedField] = useState('');
  const [scaleValue] = useState(new Animated.Value(1));
  const { setUser, setUserMobile } = useContext(UserContext);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputs = Array.from({ length: 6 }, () => useRef(null));
  const [otpLoading, setOtpLoading] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [fname, setFname] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Send OTP handler
  const handleSendOtp = async () => {
    if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
      showAlert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setLoginLoading(true);
    setOtpDigits(['', '', '', '', '', '']); // Reset OTP digits
    try {
      await axios.post(`${API_BASE_URL}/send-otp`, { mobile });
      setOtpModalVisible(true);
      setLoginLoading(false);
    } catch (error) {
      setLoginLoading(false);
      showAlert('Error', error.response?.data?.message || 'Failed to send OTP');
    }
  };

  // OTP digit change handler
  const handleOtpDigitChange = (value, idx) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[idx] = value;
    setOtpDigits(newOtp);
    if (value && idx < 5) {
      otpInputs[idx + 1].current?.focus();
    }
    if (!value && idx > 0) {
      otpInputs[idx - 1].current?.focus();
    }
  };

  // OTP validation handler
  const handleOtpValidate = async () => {
    const otpValue = otpDigits.join('');
    if (otpValue.length !== 6) {
      showAlert('Error', 'Enter 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/verify-otp`, { mobile, otp: otpValue });
      setOtpLoading(false);
      setOtpModalVisible(false);
      if (res.data.newUser) {
        setShowNameModal(true);
      } else {
        // Existing user, log in
        const userData = res.data.user;
        setUser(userData);
        setUserMobile(userData.mobile);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        navigation.replace('Main', { userMobile: userData.mobile });
      }
    } catch (err) {
      setOtpLoading(false);
      showAlert('OTP Failed', err.response?.data?.message || 'Invalid OTP');
    }
  };

  // OTP resend handler
  const handleOtpResend = async () => {
    setOtpLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/send-otp`, { mobile });
      setOtpDigits(['', '', '', '', '', '']);
      setOtpLoading(false);
    } catch (err) {
      setOtpLoading(false);
      showAlert('Failed to resend OTP', err.response?.data?.message || 'Try again');
    }
  };

  // OTP cancel handler
  const handleOtpCancel = () => {
    setOtpModalVisible(false);
    setOtpDigits(['', '', '', '', '', '']);
  };

  // Register new user handler
  const handleRegisterNewUser = async () => {
    if (!fname || fname.trim().length < 2) {
      showAlert('Error', 'Please enter your name');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/register`, { mobile, fname });
      const userData = res.data.user;
      setUser(userData);
      setUserMobile(userData.mobile);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setShowNameModal(false);
      navigation.replace('Main', { userMobile: userData.mobile });
    } catch (err) {
      setLoginLoading(false);
      showAlert('Registration Failed', err.response?.data?.message || 'Something went wrong');
    }
    setLoginLoading(false);
  };

  // Cancel name modal handler (reset OTP digits)
  const handleNameModalCancel = () => {
    setShowNameModal(false);
    setOtpDigits(['', '', '', '', '', '']);
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

  // --- Main render ---
  const MainContent = (
    <>
      <ExpoImage
        source={require('../icon_gif.gif')}
        style={styles.logo}
        contentFit="contain"
        transition={100}
      />

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

      {/* Password field commented out */}
      {/* 
      <View style={[ styles.input,{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 20 }]}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={{ flex: 1,fontSize: 16,color: '#333',paddingVertical: 0, paddingHorizontal: 0,}}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField('')}
        />
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
          <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#888" />
        </TouchableOpacity>
      </View>
      */}

      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          style={styles.button}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleSendOtp}
          disabled={loginLoading}
        >
          <Text style={styles.buttonText}>{loginLoading ? 'Sending OTP...' : 'Continue'}</Text>
        </TouchableOpacity>

        {/* 
        <TouchableOpacity
          style={styles.button}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={styles.buttonText}>Admin Login</Text>
        </TouchableOpacity> 
        */}
      </Animated.View>
    </>
  );

  // --- OTP Modal ---
  const OtpModalContent = (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 32,
      width: Platform.OS === 'web' ? '90%' : '90%',
      alignItems: 'center',
      elevation: 8
    }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#444', marginBottom: 10, textAlign: 'center' }}>
        Please enter the One-Time Password to login
      </Text>
      <Text style={{ fontSize: 15, color: '#888', marginBottom: 24, textAlign: 'center' }}>
        A One-Time Password has been sent to {mobile.replace(/^(\d{2})(\d{4})(\d{2})$/, '$1****$3')} Through WhatsApp.
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 28 }}>
        {otpDigits.map((digit, idx) =>
          Platform.OS === 'web' ? (
            <input
              key={idx}
              ref={otpInputs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              style={{
                width: 38,
                height: 48,
                borderWidth: 1.5,
                borderColor: '#ddd',
                borderRadius: 8,
                marginLeft: 6,
                marginRight: 6,
                textAlign: 'center',
                fontSize: 22,
                backgroundColor: '#f7f7f7',
              }}
              value={digit}
              onChange={e => handleOtpDigitChange(e.target.value, idx)}
              autoFocus={idx === 0}
              id={`otp-input-login-${idx}`}
            />
          ) : (
            <TextInput
              key={idx}
              ref={otpInputs[idx]}
              style={{
                width: 38,
                height: 48,
                borderWidth: 1.5,
                borderColor: '#ddd',
                borderRadius: 8,
                marginHorizontal: 6,
                textAlign: 'center',
                fontSize: 22,
                backgroundColor: '#f7f7f7',
                paddingVertical: 0,
                textAlignVertical: 'center'
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={value => handleOtpDigitChange(value, idx)}
              autoFocus={idx === 0}
              returnKeyType={idx === 5 ? 'done' : 'next'}
              blurOnSubmit={false}
            />
          )
        )}
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: '#007aff',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 32,
          marginBottom: 18,
          marginTop: 8,
          width: '100%',
          alignItems: 'center'
        }}
        onPress={handleOtpValidate}
        disabled={otpLoading}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          {otpLoading ? 'Validating...' : 'Validate'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleOtpResend} disabled={otpLoading}>
        <Text style={{ color: '#444', fontSize: 14, marginBottom: 8, textAlign: 'center', textDecorationLine: 'underline' }}>
          Resend One-Time Password
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleOtpCancel}>
        <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  // --- Name Modal for new user ---
  const NameModalContent = (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 32,
      width: Platform.OS === 'web' ? '90%' : '90%',
      alignItems: 'center',
      elevation: 8
    }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#444', marginBottom: 10, textAlign: 'center' }}>
        You're almost there! ✋
      </Text>
      <TextInput
        placeholder="Enter Your Name"
        maxLength={20}
        placeholderTextColor="#888"
        style={[styles.input, { marginBottom: 18, width: '100%' }]}
        value={fname}
        onChangeText={setFname}
        autoFocus
      />
      <TouchableOpacity
        style={{
          backgroundColor: '#007aff',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 32,
          marginBottom: 18,
          marginTop: 8,
          width: '100%',
          alignItems: 'center'
        }}
        onPress={handleRegisterNewUser}
        disabled={loginLoading}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          {loginLoading ? 'Registering...' : 'Start Shopping'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleNameModalCancel}>
        <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  // --- Render ---
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.container}>
            {MainContent}
            {/* OTP Modal */}
            {otpModalVisible && (
              <Modal
                visible={otpModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleOtpCancel}
              >
                <View style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {OtpModalContent}
                </View>
              </Modal>
            )}
            {/* Name Modal */}
            {showNameModal && (
              <Modal
                visible={showNameModal}
                transparent
                animationType="fade"
                onRequestClose={handleNameModalCancel}
              >
                <View style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {NameModalContent}
                </View>
              </Modal>
            )}
          </View>
        </ScrollView>
        <View style={styles.bottomInfoContainer}>
          <Text style={styles.agreeText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => navigation.navigate('Terms')}
            >
              Terms & Conditions
            </Text>
          </Text>
          <Text
            style={styles.adminLoginLink}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            Admin Login
          </Text>
        </View>
      </View>
    );
  }

  // Mobile
  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
              {MainContent}
              {/* OTP Modal */}
              <Modal
                visible={otpModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleOtpCancel}
              >
                <View style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {OtpModalContent}
                </View>
              </Modal>
              {/* Name Modal */}
              <Modal
                visible={showNameModal}
                transparent
                animationType="fade"
                onRequestClose={handleNameModalCancel}
              >
                <View style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {NameModalContent}
                </View>
              </Modal>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
      <SafeAreaView
        style={[
          styles.bottomInfoContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 18 }
        ]}
        edges={['bottom']}
      >
        <Text style={styles.agreeText}>
          By continuing, you agree to our{' '}
          <Text
            style={styles.termsLink}
            onPress={() => navigation.navigate('Terms')}
          >
            Terms & Conditions
          </Text>
        </Text>
        <Text
          style={styles.adminLoginLink}
          onPress={() => navigation.navigate('AdminLogin')}
        >
          Admin Login
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3f9',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    alignContent: 'center',
    alignSelf: 'center',
    marginBottom: 50,
    borderRadius: 40,
    marginTop: 100,
    resizeMode: 'contain',
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
  bottomInfoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 24 : 18,
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  agreeText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  termsLink: {
    color: '#d9534f',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  adminLoginLink: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title ? title + '\n' : ''}${message}`);
  } else {
    Alert.alert(title, message);
  }
}