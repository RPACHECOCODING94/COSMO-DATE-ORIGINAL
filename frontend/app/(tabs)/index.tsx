import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { getZodiacInfo } from '../../src/constants/zodiac';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.6;

interface PotentialMatch {
  id: string;
  full_name: string;
  zodiac_sign: string;
  gender: string;
  bio: string;
  profile_photo: string;
  compatibility: number;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [matchModal, setMatchModal] = useState<PotentialMatch | null>(null);

  const loadPotentialMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users/potential-matches');
      setPotentialMatches(response.data.potential_matches);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPotentialMatches();
  }, [loadPotentialMatches]);

  const handleSwipe = async (action: 'like' | 'dislike') => {
    if (isSwiping || currentIndex >= potentialMatches.length) return;

    const currentMatch = potentialMatches[currentIndex];
    setIsSwiping(true);

    try {
      const response = await api.post('/matches/swipe', {
        target_user_id: currentMatch.id,
        action,
      });

      if (response.data.is_match) {
        setMatchModal(currentMatch);
      }

      setCurrentIndex((prev) => prev + 1);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al procesar');
    } finally {
      setIsSwiping(false);
    }
  };

  const currentMatch = potentialMatches[currentIndex];
  const zodiacInfo = currentMatch ? getZodiacInfo(currentMatch.zodiac_sign) : null;

  if (isLoading) {
    return (
      <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#9D6DF3" />
          <Text style={styles.loadingText}>Buscando conexiones celestiales...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!currentMatch) {
    return (
      <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.emptyIcon}>🌟</Text>
          <Text style={styles.emptyTitle}>No hay más perfiles</Text>
          <Text style={styles.emptySubtitle}>
            Vuelve más tarde para encontrar nuevas conexiones
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadPotentialMatches}>
            <Ionicons name="refresh" size={20} color="#9D6DF3" />
            <Text style={styles.refreshText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Descubrir</Text>
        <View style={styles.zodiacBadge}>
          <Text style={styles.zodiacIcon}>{getZodiacInfo(user?.zodiac_sign || '').emoji}</Text>
          <Text style={styles.zodiacLabel}>{user?.zodiac_sign}</Text>
        </View>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={{ uri: currentMatch.profile_photo }}
            style={styles.cardImage}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardInfo}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{currentMatch.full_name}</Text>
                <View style={[styles.compatibilityBadge, { backgroundColor: zodiacInfo?.color }]}>
                  <Text style={styles.compatibilityText}>{currentMatch.compatibility}%</Text>
                </View>
              </View>

              <View style={styles.zodiacRow}>
                <Text style={styles.zodiacEmoji}>{zodiacInfo?.emoji}</Text>
                <Text style={styles.zodiacName}>{currentMatch.zodiac_sign}</Text>
                <View style={styles.elementBadge}>
                  <Text style={styles.elementText}>{zodiacInfo?.element}</Text>
                </View>
              </View>

              {currentMatch.bio && (
                <Text style={styles.cardBio} numberOfLines={2}>
                  {currentMatch.bio}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => handleSwipe('dislike')}
          disabled={isSwiping}
        >
          <Ionicons name="close" size={32} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('like')}
          disabled={isSwiping}
        >
          <Ionicons name="heart" size={32} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      {matchModal && (
        <View style={styles.matchOverlay}>
          <View style={styles.matchModal}>
            <Text style={styles.matchTitle}>🎉 ¡Es un Match! 🎉</Text>
            <View style={styles.matchAvatars}>
              <Image
                source={{ uri: user?.profile_photo }}
                style={styles.matchAvatar}
              />
              <Text style={styles.matchHeart}>❤️</Text>
              <Image
                source={{ uri: matchModal.profile_photo }}
                style={styles.matchAvatar}
              />
            </View>
            <Text style={styles.matchCompatibility}>
              {matchModal.compatibility}% compatibilidad zodiacal
            </Text>
            <TouchableOpacity
              style={styles.matchButton}
              onPress={() => setMatchModal(null)}
            >
              <Text style={styles.matchButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 16,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  refreshText: {
    color: '#9D6DF3',
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  zodiacBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  zodiacIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  zodiacLabel: {
    color: '#9D6DF3',
    fontSize: 14,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A3A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardInfo: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  compatibilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compatibilityText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  zodiacRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  zodiacEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  zodiacName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    marginRight: 12,
  },
  elementBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  elementText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  cardBio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dislikeButton: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  likeButton: {
    borderColor: '#FF6B9D',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModal: {
    backgroundColor: '#1A1A3A',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  matchAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  matchAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#9D6DF3',
  },
  matchHeart: {
    fontSize: 30,
    marginHorizontal: 16,
  },
  matchCompatibility: {
    color: '#9D6DF3',
    fontSize: 16,
    marginBottom: 24,
  },
  matchButton: {
    backgroundColor: '#9D6DF3',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
  },
  matchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
