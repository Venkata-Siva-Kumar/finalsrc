import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Modal, Keyboard, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Cross-platform alert
function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title ? title + '\n' : ''}${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ForgotPasswordScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState(1); // 1: mobile, 2: otp, 3: reset password
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const otpInputs = Array.from({ length: 6 }, () => useRef(null));

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      showAlert('Error', 'Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    axios.post(`${API_BASE_URL}/forgot-password/send-otp`, { mobile })
      .then(() => {
        setOtpLoading(false);
        setOtp(['', '', '', '', '', '']);
        setOtpModalVisible(true);
        setStep(2);
      })
      .catch(err => {
        setOtpLoading(false);
        showAlert('Error', err.response?.data?.message || 'Failed to send OTP');
      });
  };

  const handleOtpChange = (value, idx) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < 5) {
      otpInputs[idx + 1].current.focus();
    }
    if (!value && idx > 0) {
      otpInputs[idx - 1].current.focus();
    }
  };

  const verifyOtp = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showAlert('Error', 'Enter 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    axios.post(`${API_BASE_URL}/verify-otp`, { mobile, otp: otpValue })
      .then(() => {
        setOtpLoading(false);
        setOtpModalVisible(false);
        setStep(3);
      })
      .catch(err => {
        setOtpLoading(false);
        showAlert('Error', err.response?.data?.message || 'Invalid OTP');
      });
  };

  const resetPassword = () => {
    const otpValue = otp.join('');
    if (!newPassword || !confirmPassword) {
      showAlert('Error', 'Enter new password and confirm password');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }
    setOtpLoading(true);
    axios.post(`${API_BASE_URL}/forgot-password/reset`, { mobile, otp: otpValue, newPassword })
      .then(() => {
        setOtpLoading(false);
        showAlert('Success', 'Password updated successfully');
        navigation.replace('Login');
      })
      .catch(err => {
        setOtpLoading(false);
        showAlert('Error', err.response?.data?.message || 'Failed to update password');
      });
  };

  const handleCancel = () => {
    setOtpModalVisible(false);
    setOtp(['', '', '', '', '', '']);
    setStep(1);
  };

  // Platform-specific rendering for web/mobile
  const MainContent = (
    <View style={styles.container}>
      {step === 1 && (
        <>
          <Text style={styles.label}>Enter your registered mobile number</Text>
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={mobile}
            maxLength={10}
            onChangeText={setMobile}
          />
          <TouchableOpacity style={styles.button} onPress={sendOtp} disabled={otpLoading}>
            <Text style={styles.buttonText}>{otpLoading ? 'Sending OTP...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.modalContainer}>
          <View style={styles.otpModalContent}>
            <Text style={styles.otpTitle}>Please enter the One-Time Password to verify your account</Text>
            <Text style={styles.otpSubtitle}>
              A One-Time Password has been sent to {mobile.replace(/^(\d{2})(\d{4})(\d{2})$/, '$1****$3')}
            </Text>
            <View style={styles.otpInputRow}>
              {Platform.OS === 'web'
                ? otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpInputs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      style={{
                        width: 38,
                        height: 48,
                        borderWidth: '1.5px',
                        borderColor: '#ddd',
                        borderRadius: 8,
                        marginLeft: 6,
                        marginRight: 6,
                        textAlign: 'center',
                        fontSize: 22,
                        backgroundColor: '#f7f7f7',
                      }}
                      value={digit}
                      onChange={e => handleOtpChange(e.target.value, idx)}
                      autoFocus={idx === 0}
                      id={`otp-input-forgot-${idx}`}
                    />
                  ))
                : otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={otpInputs[idx]}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={value => handleOtpChange(value, idx)}
                      autoFocus={idx === 0}
                      returnKeyType={idx === 5 ? 'done' : 'next'}
                      blurOnSubmit={false}
                    />
                  ))
              }
            </View>
            <TouchableOpacity
              style={styles.validateButton}
              onPress={verifyOtp}
              disabled={otpLoading}
            >
              <Text style={styles.validateButtonText}>{otpLoading ? 'Validating...' : 'Validate'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendOtp} disabled={otpLoading}>
              <Text style={styles.resendText}>Resend One-Time Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.wrongNumberText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {step === 3 && (
        <>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={otpLoading}>
            <Text style={styles.buttonText}>{otpLoading ? 'Updating...' : 'Confirm'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    Platform.OS === 'web' ? (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {MainContent}
      </ScrollView>
    ) : (
      MainContent
    )
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef3f9', justifyContent: 'center', padding: 24 },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#333', marginBottom: 20 },
  button: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 0.4 },
  // OTP Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  otpModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 32, width: '90%', alignItems: 'center', elevation: 8 },
  otpTitle: { fontWeight: 'bold', fontSize: 18, color: '#444', marginBottom: 10, textAlign: 'center' },
  otpSubtitle: { fontSize: 15, color: '#888', marginBottom: 24, textAlign: 'center' },
  otpInputRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  otpInput: {
    width: 38, height: 48, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    marginHorizontal: 6, textAlign: 'center', fontSize: 22, backgroundColor: '#f7f7f7', textAlignVertical: 'center',
  },
  validateButton: { backgroundColor: '#ff6b6b', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 18, marginTop: 8 },
  validateButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resendText: { color: '#444', fontSize: 14, marginBottom: 8, textAlign: 'center', textDecorationLine: 'underline' },
  wrongNumberText: { color: '#888', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
});