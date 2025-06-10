import React, { useEffect, useState,useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert,Linking } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons"; // Add this import
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { UserContext } from '../UserContext'; 
import { API_BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountScreen({ navigation,route }) {
  // Example user data, replace with real data as needed

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [ordersUpdated, setOrdersUpdated] = useState(false);
  const { user } = useContext(UserContext);
  const userId = user?.id;
  const userMobile = user?.mobile || route.params?.userMobile;
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/contact-center`)
      .then(res => res.json())
      .then(data => setContactDetails(data))
      .catch(() => setContactDetails([]));
  }, []);

   useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      let url = '';
      if (userId) {
        url = `${API_BASE_URL}/orders?user_id=${userId}`;
      } else if (userMobile) {
        url = `${API_BASE_URL}/orders?mobile=${userMobile}`;
      } else {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setOrders(data || []);
          setFilteredOrders(data || []);
        })
        .catch(() => {
          setOrders([]);
          setFilteredOrders([]);
        })
        .finally(() => setLoading(false));
    }, [userId, userMobile, route.params?.refresh,])
  );

  useEffect(() => {
    if (userMobile) {
      fetch(`${API_BASE_URL}/user?mobile=${userMobile}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setFname(data.user.fname || '');
            setLname(data.user.lname || '');
          }
        })
        .catch(() => {});
    }
  }, [userMobile]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => navigation.replace('Login'),
      },
    ]);
  };

  const handleProfileUpdate = (newFname, newLname) => {
    setFname(newFname);
    setLname(newLname);
  };

  const handleOrdersUpdate = () => {
  setOrdersUpdated(prev => !prev); // Toggle to trigger refresh
};


  return (
    <View style={styles.container}>
      <MaskedView
          maskElement={
            <Text style={styles.userName}>
            Hello!  {fname}
            </Text>
          }
        >
          <LinearGradient
            colors={['#4f8cff', '#34e9e1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.userName, { opacity: 0 }]}>
              {fname} {lname}
            </Text>
          </LinearGradient>
        </MaskedView>
      <View style={styles.gridSection}>
        <View style={styles.row}>

          <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Orders', {userId: user?.id , userMobile, refresh: Date.now() } )}>
            <Ionicons name="bag-handle-outline" size={32} color="#333" style={styles.icon} />
            <Text style={styles.sectionText}>Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Profile', { userMobile, refresh: Date.now() })}>
            <Ionicons name="person-outline" size={32} color="#333" style={styles.icon} />
            <Text style={styles.sectionText}>Profile</Text>
          </TouchableOpacity>

        </View>
        <View style={styles.row}>

          <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('ContactCenter')}>
            <Ionicons name="call-outline" size={32} color="#333" style={styles.icon} />
            <Text style={styles.sectionText}>Contact Center</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={32} color="#ff4d4d" style={styles.icon} />
            <Text style={[styles.sectionText, { color: '#ff4d4d' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  gridSection: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  gridButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingVertical: 32,
    marginHorizontal: 8,
    elevation: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  icon: { marginBottom: 8 },
  sectionText: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 8 },
});