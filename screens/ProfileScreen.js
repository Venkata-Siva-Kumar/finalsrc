import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform, ScrollView,KeyboardAvoidingView } from 'react-native';
import { CartContext } from './CartContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config';

function isValidDob(dob) {
  // Expects dd-mm-yyyy
  if (!dob || dob.length !== 10) return false;
  const [dd, mm, yyyy] = dob.split('-').map(Number);
  const now = new Date();
  if (
    !dd || !mm || !yyyy ||
    dd < 1 || dd > 31 ||
    mm < 1 || mm > 12 ||
    yyyy < 1900 || yyyy > now.getFullYear()
  ) return false;
  // Check for real date (e.g., not 31-02-2020)
  const date = new Date(yyyy, mm - 1, dd);
  return (
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd
  );
}

// Helper: always display dd-mm-yyyy
function formatDobToDisplay(dob) {
  if (!dob) return '';
  const parts = dob.split('-');
  if (parts[0].length === 4) {
    // yyyy-mm-dd -> dd-mm-yyyy
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dob;
}

function parseLocalDate(dob) {
  if (!dob) return new Date();
  const parts = dob.split('-');
  if (parts.length === 3) {
    // dd-mm-yyyy
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date();
}

export default function ProfileScreen({ route, navigation }) {
  const userMobile = route.params?.userMobile;
  const { orderPlaced } = useContext(CartContext);

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [mobile, setMobile] = useState(userMobile || '');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMobile, setDeleteMobile] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userMobile) {
      fetch(`${API_BASE_URL}/user?mobile=${userMobile}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setFname(data.user.fname || '');
            setLname(data.user.lname || '');
            setMobile(data.user.mobile || '');
            setEmail(data.user.email || '');
            setGender(data.user.gender || '');
            setDob(formatDobToDisplay(data.user.dob || ''));
            setOriginalProfile({
              fname: data.user.fname || '',
              lname: data.user.lname || '',
              mobile: data.user.mobile || '',
              email: data.user.email || '',
              gender: data.user.gender || '',
              dob: formatDobToDisplay(data.user.dob || ''),
            });
          } else {
            Alert.alert('User not found');
          }
        })
        .catch(() => Alert.alert('Error fetching user data'));
    }
  }, [userMobile, route.params?.refresh]);

  const isUnchanged =
    originalProfile &&
    fname === originalProfile.fname &&
    lname === originalProfile.lname &&
    mobile === originalProfile.mobile &&
    email === originalProfile.email &&
    gender === originalProfile.gender &&
    dob === originalProfile.dob;


  const handleSave = async () => {
    if (!fname || !lname || !gender) {
      Alert.alert('Please fill all required fields: First Name, Last Name, Gender');
      return;
    }
    if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    Alert.alert('Invalid Email', 'Please enter a valid email address.');
    return;
  }
  if (dob && !isValidDob(dob)) {
    Alert.alert('Invalid DOB', 'Check for valid dob.');
    return;
  }
  
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          fname,
          lname,
          email,
          gender,
          dob: dob,
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Profile updated!');
        navigation.navigate('Main', { screen: 'Account', params: { userMobile: mobile, refresh: Date.now() } });
      } else {
        Alert.alert('Update failed', data.message || '');
      }
    } catch (e) {
      Alert.alert('Error updating profile');
    }
    setLoading(false);
  };

  // Always set dob in dd-mm-yyyy format
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDob(`${day}-${month}-${year}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
    <View >
        <Text style={styles.header}> 🧑‍💼</Text>
    </View>
      <TextInput
        placeholder="First Name"
        placeholderTextColor="#888"
        style={styles.input}
        value={fname}
        onChangeText={setFname}
      />
      <TextInput
        placeholder="Last Name"
        placeholderTextColor="#888"
        style={styles.input}
        value={lname}
        onChangeText={setLname}
      />
      <TextInput
        placeholder="Mobile Number"
        placeholderTextColor="#888"
        style={[styles.input, { backgroundColor: '#eee' }]}
        value={mobile}
        editable={false}
      />
      <View style={styles.genderContainer}>
        <Text style={{ marginBottom: 8 }}>Gender:</Text>
        <TouchableOpacity style={styles.radioContainer} onPress={() => setGender('Male')}>
          <View style={[styles.radio, gender === 'Male' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioContainer} onPress={() => setGender('Female')}>
          <View style={[styles.radio, gender === 'Female' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Female</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioContainer} onPress={() => setGender('Other')}>
          <View style={[styles.radio, gender === 'Other' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Other</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder="user@gmail.com (optional)"
        placeholderTextColor="#888"
        keyboardType="email-address"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
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
          style={[styles.input, styles.inputUnique, { flex: 1, marginBottom: 0 }]}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ marginLeft: 8 }}>
          <Text style={{ fontSize: 22, color: '#007bff' }}>📅</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={parseLocalDate(dob)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}
      <TouchableOpacity style={[ styles.button, (loading || isUnchanged) && { backgroundColor: '#ccc' } ]}
          onPress={handleSave}
          disabled={loading || isUnchanged}
      >
          <Text style={[ styles.buttonText, (loading || isUnchanged) && { color: '#888' } ]}>
            {loading ? 'Saving...' : 'Update'}
          </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#d9534f', marginTop: 10 }]}
        onPress={() => setShowDeleteModal(true)}
      >
        <Text style={[styles.buttonText, { color: '#fff' }]}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
    {showDeleteModal && (
  <View style={{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10
  }}>
    <View style={{
      backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', elevation: 5
    }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: '#d9534f', textAlign: 'center' }}>
        Delete Account
      </Text>
      <Text style={{ marginBottom: 12, textAlign: 'center' }}>
        Enter your mobile and password to confirm account deletion.
      </Text>
      <TextInput
        placeholder="Mobile Number"
        placeholderTextColor="#888"
        style={styles.input}
        value={deleteMobile}
        onChangeText={setDeleteMobile}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        style={styles.input}
        value={deletePassword}
        onChangeText={setDeletePassword}
        secureTextEntry
      />
      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        style={styles.input}
        value={deleteConfirmPassword}
        onChangeText={setDeleteConfirmPassword}
        secureTextEntry
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ccc', flex: 1, marginRight: 8 }]}
          onPress={() => {
            setShowDeleteModal(false);
            setDeleteMobile('');
            setDeletePassword('');
            setDeleteConfirmPassword('');
          }}
          disabled={deleting}
        >
          <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#d9534f', flex: 1, marginLeft: 8 }]}
          onPress={async () => {
            if (!deleteMobile || !deletePassword || !deleteConfirmPassword) {
              Alert.alert('Error', 'Please fill all fields.');
              return;
            }
            if (deletePassword !== deleteConfirmPassword) {
              Alert.alert('Error', 'Passwords do not match.');
              return;
            }
            if (deleteMobile !== userMobile) {
              Alert.alert(  'Mobile Number Mismatch',  'The entered mobile number does not match your logged-in mobile number.');
              return;
            }
            setDeleting(true);
            try {
              const response = await fetch(`${API_BASE_URL}/delete-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mobile: deleteMobile,
                  password: deletePassword,
                }),
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert('Account Deleted', 'Your account has been deleted.', [
                  { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
                ]);
              } else {
                Alert.alert('Delete Failed', data.message || 'Could not delete account.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account.');
            }
            setDeleting(false);
            setShowDeleteModal(false);
            setDeleteMobile('');
            setDeletePassword('');
            setDeleteConfirmPassword('');
          }}
          disabled={deleting}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 }, 

  profileImageContainer: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#0066cc',
    borderRadius: 60,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
    // Optional: shadow for iOS and elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { fontSize: 60, fontWeight: 'bold', marginBottom: 10,    marginRight: 10, textAlign: 'center', },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15,
  },
  button: {
    backgroundColor: '#0066cc', padding: 15, borderRadius: 8, marginBottom: 15,
  },
  buttonText: { color: 'white', fontSize: 18, textAlign: 'center' },
  genderContainer: { marginBottom: 15 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  radio: {
    height: 18, width: 18, borderRadius: 9, borderWidth: 2, borderColor: '#0066cc',
    marginRight: 8, alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#0066cc',
  },
  radioLabel: { fontSize: 16 },
  inputUnique: {},
});