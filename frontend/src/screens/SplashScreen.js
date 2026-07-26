import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.brandTitle}>
          KROOS <Text style={styles.brandAccent}>MASTER</Text>
        </Text>
        <Text style={styles.tagline}>Consigue tu acceso al instante</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandAccent: {
    color: '#00FF87',
  },
  tagline: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
});
