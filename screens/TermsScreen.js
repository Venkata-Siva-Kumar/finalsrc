import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import TERMS_TEXT from './TermsText';

export default function TermsScreen({ navigation, route }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef(null);

  const handleAgree = () => {
  if (route.params?.onAgree) {
    route.params.onAgree();
  }
  navigation.goBack();
};

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={true}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
            setScrolledToEnd(true);
          }
        }}
        scrollEventThrottle={16}
      >
        <Text style={styles.text}>{TERMS_TEXT}</Text>
      </ScrollView>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#eee', marginRight: 8 }]}
          onPress={handleCancel}
        >
          <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: scrolledToEnd ? '#28a745' : '#b5e0c7', marginLeft: 8 }
          ]}
          disabled={!scrolledToEnd}
          onPress={handleAgree}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agree</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 18,
    paddingTop: 0,
  },
  
  scroll: {
    flex: 1,
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});