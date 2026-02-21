import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>✨</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']}
        style={styles.gradient}
      >
        {/* Floating Zodiac Symbols */}
        <View style={styles.zodiacContainer}>
          {ZODIAC_SYMBOLS.map((symbol, index) => (
            <Text
              key={index}
              style={[
                styles.zodiacSymbol,
                {
                  top: Math.random() * (height * 0.5),
                  left: Math.random() * (width - 40),
                  opacity: 0.1 + Math.random() * 0.2,
                },
              ]}
            >
              {symbol}
            </Text>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🌙</Text>
            </View>
            <Text style={styles.logoText}>Cosmo Date</Text>
            <Text style={styles.tagline}>Encuentra tu conexión celestial</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="star" size={24} color="#9D6DF3" />
              <Text style={styles.featureText}>Compatibilidad zodiacal</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="heart" size={24} color="#FF6B9D" />
              <Text style={styles.featureText}>Matches basados en las estrellas</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="location" size={24} color="#6BB3FF" />
              <Text style={styles.featureText}>Exclusivo para Hermosillo, Sonora</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/register')}
            >
              <LinearGradient
                colors={['#9D6DF3', '#6B4DE6']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Comenzar</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hermosillo, Sonora 🇲🇽</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A1A',
  },
  loadingText: {
    fontSize: 60,
  },
  zodiacContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  zodiacSymbol: {
    position: 'absolute',
    fontSize: 30,
    color: '#9D6DF3',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(157, 109, 243, 0.5)',
  },
  logoIcon: {
    fontSize: 60,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  featuresContainer: {
    marginBottom: 50,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  secondaryButton: {
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#9D6DF3',
  },
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
