import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';

export default function AppHeaderIcon({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginLeft:12,marginBottom: 13 }}>
      <View
        style={{
          width: 49,
          height: 49,
          borderRadius: 30,
          borderWidth: 2,
          borderColor: '#007aff', // Change to your preferred color
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff', // Optional: background inside the circle
        }}
      >
        <Image
          source={require('../icon.png')}
          style={{ width: 36, height: 36, borderRadius: 9 }}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
}