import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, StyleSheet, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TERMS_TEXT from './TermsText';
import { API_BASE_URL } from '../config';

function formatDateToDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Improved: Helper to convert dd-mm-yyyy to Date object
function parseDDMMYYYYtoDate(str) {
  if (!str || typeof str !== 'string') return null;
  const [day, month, year] = str.split('-').map(Number);
  // Check for valid numbers and valid date
  if (
    !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
    day < 1 || day > 31 || month < 1 || month > 12 || year < 1900
  ) return null;
  const date = new Date(year, month - 1, day);
  // Check if the date is valid (e.g., not 31 Feb)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}

function isAtLeast18(dob) {
  // dob is expected as dd-mm-yyyy string
  const birthDate = parseDDMMYYYYtoDate(dob);
  if (!birthDate || isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
}

export default function SignupScreen({ navigation }) {
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);

  const onChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setDob(formatDateToDDMMYYYY(selectedDate));
    }
  };

  const handleSignup = () => {
    const requiredFields = { fname, lname, mobile, password, confirmPassword, gender, dob };
    let newTouched = {};
    let hasError = false;

    Object.entries(requiredFields).forEach(([key, value]) => {
      if (!value) {
        newTouched[key] = true;
        hasError = true;
      }
    });

    setTouched(newTouched);

    if (hasError) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      Alert.alert('Error', 'Please enter a valid Indian mobile number');
      return;
    }
    if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Looks Password Mismatch');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'You must read & accept the Terms and Conditions to sign up.');
      return;
    }

    if (!dob || dob.trim() === '') {
      Alert.alert('Date of Birth Required', 'Please enter your date of birth.');
      return;
    }

    if (!isAtLeast18(dob)) {
      Alert.alert('Age Restriction', 'You must be at least 18 years old to sign up.');
      return;
    }

    axios.post(`${API_BASE_URL}/signup`, { fname, lname, mobile, password, gender, email, dob })
      .then(res => {
        Alert.alert('Success', res.data.message, [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Something went wrong';
        if (msg.includes('already exists') || msg.includes('already registered')) {
          Alert.alert('Signup Failed', 'This mobile number is already registered.');
        } else {
          Alert.alert('Signup Failed', msg);
        }
      });
  };

  return (
    <ScrollView>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* First Name */}
          <Text style={styles.label}>
            First Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            placeholder="First Name"
            placeholderTextColor="#888"
            style={[
              styles.input,
              touched.fname && !fname ? styles.inputError : styles.inputUnique
            ]}
            value={fname}
            maxLength={15}
            onChangeText={text => {
              setFname(text);
              setTouched(t => ({ ...t, fname: false }));
            }}
          />

          {/* Last Name */}
          <Text style={styles.label}>
            Last Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#888"
            style={[
              styles.input,
              touched.lname && !lname ? styles.inputError : styles.inputUnique
            ]}
            value={lname}
            maxLength={15}
            onChangeText={text => {
              setLname(text);
              setTouched(t => ({ ...t, lname: false }));
            }}
          />

          {/* Mobile Number */}
          <Text style={styles.label}>
            Mobile Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            placeholder="Mobile Number"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            style={[
              styles.input,
              touched.mobile && !mobile ? styles.inputError : styles.inputUnique
            ]}
            value={mobile}
            maxLength={10}
            onChangeText={text => {
              setMobile(text.replace(/[^0-9]/g, ''));
              setTouched(t => ({ ...t, mobile: false }));
            }}
          />

          {/* Password */}
          <Text style={styles.label}>
            Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.input, styles.inputUnique, styles.passwordRow, touched.password && !password ? styles.inputError : null]}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>
            Confirm Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.input, styles.inputUnique, styles.passwordRow, touched.confirmPassword && !confirmPassword ? styles.inputError : null]}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={styles.passwordInput}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)}>
              <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Gender */}
          <Text style={styles.label}>
            Gender <Text style={styles.required}>*</Text>
          </Text>
          <View style={[
            styles.genderContainer,
            touched.gender && !gender ? styles.inputError : styles.inputUnique
          ]}>
            <TouchableOpacity style={styles.radioContainer} onPress={() => { setGender('Male'); setTouched(t => ({ ...t, gender: false })); }}>
              <View style={[styles.radio, gender === 'Male' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioContainer} onPress={() => { setGender('Female'); setTouched(t => ({ ...t, gender: false })); }}>
              <View style={[styles.radio, gender === 'Female' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Female</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioContainer} onPress={() => { setGender('Other'); setTouched(t => ({ ...t, gender: false })); }}>
              <View style={[styles.radio, gender === 'Other' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Other</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            placeholder="abcd@gmail.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            style={[styles.input, styles.inputUnique]}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>
            Date of Birth <Text style={styles.required}>*</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TextInput
              placeholder="dd-mm-yyyy"
              placeholderTextColor="#888"
              value={dob}
              maxLength={10}
              keyboardType="number-pad"
              onChangeText={text => {
                // Remove non-digits and limit to 8 digits
                let cleaned = text.replace(/[^0-9]/g, '').slice(0, 8);
                let formatted = '';
                if (cleaned.length <= 2) {
                  formatted = cleaned;
                } else if (cleaned.length <= 4) {
                  formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
                } else {
                  formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
                }
                setDob(formatted);
              }}
              style={[
                styles.input,
                touched.dob && !dob ? styles.inputError : styles.inputUnique,
                { flex: 1, marginBottom: 0 }
              ]}
            />
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 22, color: '#007bff' }}>📅</Text>
            </TouchableOpacity>
          </View>
          {showPicker && (
            <DateTimePicker
              value={dob && parseDDMMYYYYtoDate(dob) ? parseDDMMYYYYtoDate(dob) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChange}
              maximumDate={new Date()}
            />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              style={{
                width: 22,
                height: 22,
                borderWidth: 1.5,
                borderColor: '#0066cc',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
                backgroundColor: acceptedTerms ? '#0066cc' : '#fff',
              }}
            >
              {acceptedTerms && (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: '#222' }}>
              I accept the{' '}
              <Text
                style={{ color: '#0066cc', textDecorationLine: 'underline' }}
                onPress={() => setShowTermsModal(true)}
              >
                Terms and Conditions
              </Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
        {showTermsModal && (
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-start',
            alignItems: 'center',
            zIndex: 10
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: '100%',
              height: '100%',
              padding: 24,
              paddingBottom: 32,
              elevation: 5,
              justifyContent: 'flex-start'
            }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: '#0066cc', textAlign: 'center' }}>
                Terms and Conditions
              </Text>
              <ScrollView
                style={{ flex: 1, marginBottom: 20 }}
                onScroll={({ nativeEvent }) => {
                  const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                  if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
                    setTermsScrolledToEnd(true);
                  }
                }}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}
              >
                <Text style={{ fontSize: 14, color: '#333' }}>
                  {TERMS_TEXT}
                </Text>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#eee',
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginRight: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setShowTermsModal(false);
                    setTermsScrolledToEnd(false);
                  }}
                >
                  <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: termsScrolledToEnd ? '#28a745' : '#b5e0c7',
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginLeft: 8,
                    alignItems: 'center'
                  }}
                  disabled={!termsScrolledToEnd}
                  onPress={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                    setTermsScrolledToEnd(false);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agree</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    flex: 1,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
    marginTop: 4,
    color: '#222',
    letterSpacing: 0.2,
  },
  required: {
    color: 'red',
    fontWeight: 'bold',
  },
  input: {
    padding: 8,
    fontSize: 16,
    marginBottom: 12,
    borderRadius: 7,
    backgroundColor: '#f9fafd',
    borderWidth: 1,
    color: '#4b5563',
  },
  inputUnique: {
    borderColor: '#b2bec3',
  },
  inputError: {
    borderColor: 'red',
    backgroundColor: '#fff0f0',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 25,
    elevation: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  link: {
    color: '#0066cc',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 7,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafd',
    borderWidth: 1,
    borderColor: '#b2bec3',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  radio: {
    height: 14,
    width: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#0066cc',
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  radioLabel: {
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '#4b5563',
  },
});