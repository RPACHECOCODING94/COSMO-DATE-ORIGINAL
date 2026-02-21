import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { getZodiacInfo } from '../../src/constants/zodiac';

const GENDER_PREFERENCES = [
  { value: 'masculino', label: 'Masculino', icon: 'male' },
  { value: 'femenino', label: 'Femenino', icon: 'female' },
  { value: 'otros', label: 'Otros', icon: 'transgender' },
  { value: 'todos', label: 'Todos', icon: 'people' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [preferredGender, setPreferredGender] = useState(user?.preferred_gender || 'todos');
  const [isSaving, setIsSaving] = useState(false);

  const zodiacInfo = getZodiacInfo(user?.zodiac_sign || '');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        await api.put('/users/profile', { profile_photo: newPhoto });
        updateUser({ profile_photo: newPhoto });
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      } catch (error) {
        Alert.alert('Error', 'No se pudo actualizar la foto');
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.put('/users/profile', {
        bio,
        preferred_gender: preferredGender,
      });
      updateUser({ bio, preferred_gender: preferredGender });
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#9D6DF3" />
            ) : (
              <Ionicons
                name={isEditing ? 'checkmark' : 'create-outline'}
                size={24}
                color="#9D6DF3"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          <Image
            source={{ uri: user?.profile_photo }}
            style={styles.profilePhoto}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={styles.cameraButton}>
            <Ionicons name="camera" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Name & Zodiac */}
        <Text style={styles.userName}>{user?.full_name}</Text>
        <View style={styles.zodiacContainer}>
          <Text style={styles.zodiacEmoji}>{zodiacInfo.emoji}</Text>
          <Text style={styles.zodiacSign}>{user?.zodiac_sign}</Text>
          <View style={[styles.elementBadge, { backgroundColor: zodiacInfo.color }]}>
            <Text style={styles.elementText}>{zodiacInfo.element}</Text>
          </View>
        </View>

        {/* Premium Status */}
        <View style={[styles.premiumCard, user?.is_premium && styles.premiumActive]}>
          <Ionicons
            name={user?.is_premium ? 'star' : 'star-outline'}
            size={24}
            color={user?.is_premium ? '#FFD700' : 'rgba(255,255,255,0.5)'}
          />
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumLabel}>
              {user?.is_premium ? 'Usuario Premium' : 'Cuenta Gratuita'}
            </Text>
            <Text style={styles.premiumDescription}>
              {user?.is_premium
                ? 'Acceso a citas románticas'
                : 'Solo chat con matches'}
            </Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre mí</Text>
          {isEditing ? (
            <TextInput
              style={styles.bioInput}
              placeholder="Cuéntanos sobre ti..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={500}
            />
          ) : (
            <Text style={styles.bioText}>
              {user?.bio || 'No has agregado una descripción aún'}
            </Text>
          )}
        </View>

        {/* Gender Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Busco</Text>
          <View style={styles.genderGrid}>
            {GENDER_PREFERENCES.map((pref) => (
              <TouchableOpacity
                key={pref.value}
                style={[
                  styles.genderOption,
                  preferredGender === pref.value && styles.genderSelected,
                  !isEditing && preferredGender !== pref.value && styles.genderDisabled,
                ]}
                onPress={() => isEditing && setPreferredGender(pref.value)}
                disabled={!isEditing}
              >
                <Ionicons
                  name={pref.icon as any}
                  size={20}
                  color={preferredGender === pref.value ? '#9D6DF3' : 'rgba(255,255,255,0.5)'}
                />
                <Text
                  style={[
                    styles.genderText,
                    preferredGender === pref.value && styles.genderTextSelected,
                  ]}
                >
                  {pref.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de cuenta</Text>
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.infoText}>Hermosillo, Sonora</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.infoText}>
              Género: {user?.gender?.charAt(0).toUpperCase()}{user?.gender?.slice(1)}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Cosmo Date v1.0.0</Text>
        <Text style={styles.locationText}>Exclusivo para Hermosillo, Sonora 🇲🇽</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#9D6DF3',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9D6DF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  zodiacContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  zodiacEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  zodiacSign: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 12,
  },
  elementBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  elementText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumActive: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  premiumInfo: {
    marginLeft: 12,
  },
  premiumLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9D6DF3',
    marginBottom: 12,
  },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genderSelected: {
    borderColor: '#9D6DF3',
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
  },
  genderDisabled: {
    opacity: 0.5,
  },
  genderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginLeft: 6,
  },
  genderTextSelected: {
    color: '#9D6DF3',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginBottom: 24,
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginLeft: 8,
  },
  versionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
  },
  locationText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
