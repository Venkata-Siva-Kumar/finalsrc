import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { API_BASE_URL } from '../config';


export default function ForgotPasswordScreen({ navigation }) {
  const [mobile, setMobile] = useState('');

  const handleDeleteUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${mobile}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (response.ok) {
      Alert.alert('Deleted', 'Your account has been deleted.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } else {
      Alert.alert('Error', data.message || 'User not found.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to delete account.');
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Delete Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Mobile Number"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
        maxLength={10}
      />
      <TouchableOpacity style={styles.button} onPress={handleDeleteUser}>
        <Text style={styles.buttonText}>Delete Account</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d11a2a',
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
  button: {
    backgroundColor: '#d11a2a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#d11a2a',
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
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});