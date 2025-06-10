import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../config';

export default function ContactCenterScreen({ navigation }) {
  const [contactDetails, setContactDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/contact-center`)
      .then(res => res.json())
      .then(data => setContactDetails(data))
      .catch(() => setContactDetails([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePress = (detail) => {
    if (detail.type === 'phone') {
      Linking.openURL(`tel:${detail.value}`);
    } else if (detail.type === 'whatsapp') {
      Linking.openURL(`https://wa.me/${detail.value}`);
    } else if (detail.type === 'email') {
      Linking.openURL(`mailto:${detail.value}`);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
      <Ionicons
        name={
          item.type === 'phone'
            ? 'call-outline'
            : item.type === 'whatsapp'
            ? 'logo-whatsapp'
            : item.type === 'email'
            ? 'mail-outline'
            : 'help-circle-outline'
        }
        size={28}
        color={item.type === 'whatsapp' ? '#25D366' : '#007bff'}
        style={{ marginRight: 16 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.type}>{item.description || item.type}</Text>
        <Text style={styles.value}>{item.value}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
      ) : contactDetails.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 40 }}>No contact details available.</Text>
      ) : (
        <FlatList
          data={contactDetails}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  type: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  value: { fontSize: 15, color: '#555', marginTop: 2 },
});