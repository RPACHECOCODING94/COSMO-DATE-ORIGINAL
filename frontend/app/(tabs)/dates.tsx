import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { DATE_TYPES } from '../../src/constants/zodiac';

interface Match {
  match_id: string;
  compatibility: number;
  user: {
    id: string;
    full_name: string;
    profile_photo: string;
    zodiac_sign: string;
  };
}

interface DateRequest {
  id: string;
  match_id: string;
  date_type: string;
  proposed_datetime: string;
  status: string;
  payment_status: string;
  is_requester: boolean;
  other_user: {
    id: string;
    full_name: string;
    profile_photo: string;
  };
  created_at: string;
}

export default function DatesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [dateRequests, setDateRequests] = useState<DateRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedDateType, setSelectedDateType] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [datesRes, matchesRes] = await Promise.all([
        api.get('/dates'),
        api.get('/matches'),
      ]);
      setDateRequests(datesRes.data.date_requests || []);
      setMatches(matchesRes.data.matches || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDate = async () => {
    if (!selectedMatch || !selectedDateType || !proposedDate) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    setIsCreating(true);
    try {
      await api.post('/dates/request', {
        match_id: selectedMatch.match_id,
        date_type: selectedDateType,
        proposed_datetime: proposedDate,
      });
      Alert.alert('Éxito', 'Solicitud de cita enviada');
      setShowCreateModal(false);
      setSelectedMatch(null);
      setSelectedDateType('');
      setProposedDate('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al crear la cita');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRespondToDate = async (dateId: string, response: 'accepted' | 'rejected') => {
    try {
      await api.put(`/dates/${dateId}/respond?response=${response}`);
      Alert.alert('Éxito', `Cita ${response === 'accepted' ? 'aceptada' : 'rechazada'}`);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al responder');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFB347';
      case 'accepted': return '#77DD77';
      case 'rejected': return '#FF6B6B';
      default: return '#888';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  };

  const renderDateItem = ({ item }: { item: DateRequest }) => {
    const dateType = DATE_TYPES[item.date_type as keyof typeof DATE_TYPES];
    return (
      <View style={styles.dateCard}>
        <View style={styles.dateHeader}>
          <Image
            source={{ uri: item.other_user.profile_photo }}
            style={styles.dateAvatar}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={styles.dateInfo}>
            <Text style={styles.dateName}>{item.other_user.full_name}</Text>
            <View style={styles.dateTypeRow}>
              <Text style={styles.dateEmoji}>{dateType?.emoji}</Text>
              <Text style={styles.dateTypeText}>{dateType?.label}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.dateDetails}>
          <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.dateTime}>
            {new Date(item.proposed_datetime).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {!item.is_requester && item.status === 'pending' && (
          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={[styles.responseButton, styles.rejectButton]}
              onPress={() => handleRespondToDate(item.id, 'rejected')}
            >
              <Ionicons name="close" size={20} color="#FF6B6B" />
              <Text style={styles.rejectText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.responseButton, styles.acceptButton]}
              onPress={() => handleRespondToDate(item.id, 'accepted')}
            >
              <Ionicons name="checkmark" size={20} color="#77DD77" />
              <Text style={styles.acceptText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          <View style={styles.paymentInfo}>
            <Ionicons name="card" size={16} color="#FFD700" />
            <Text style={styles.paymentText}>
              Pago: {item.payment_status === 'paid' ? 'Completado' : 'Pendiente (Transferencia o efectivo)'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!user?.is_premium) {
    return (
      <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
        <View style={[styles.premiumContainer, { paddingTop: insets.top }]}>
          <View style={styles.premiumCard}>
            <Text style={styles.premiumIcon}>🌟</Text>
            <Text style={styles.premiumTitle}>Función Premium</Text>
            <Text style={styles.premiumDescription}>
              Las citas románticas (Cena, Baile, Cine) son exclusivas para usuarios Premium.
            </Text>
            <View style={styles.premiumFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="restaurant" size={20} color="#9D6DF3" />
                <Text style={styles.featureText}>Cenas románticas</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="musical-notes" size={20} color="#9D6DF3" />
                <Text style={styles.featureText}>Noches de baile</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="film" size={20} color="#9D6DF3" />
                <Text style={styles.featureText}>Citas al cine</Text>
              </View>
            </View>
            <View style={styles.paymentMethods}>
              <Text style={styles.paymentTitle}>Métodos de pago:</Text>
              <Text style={styles.paymentMethod}>• Transferencia bancaria</Text>
              <Text style={styles.paymentMethod}>• Pago en efectivo</Text>
            </View>
            <Text style={styles.contactText}>
              Contacta soporte para activar Premium
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#9D6DF3" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Citas</Text>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.premiumLabel}>Premium</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {dateRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💘</Text>
          <Text style={styles.emptyTitle}>No tienes citas programadas</Text>
          <Text style={styles.emptySubtitle}>
            Crea una cita romántica con tus matches
          </Text>
        </View>
      ) : (
        <FlatList
          data={dateRequests}
          renderItem={renderDateItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#9D6DF3"
            />
          }
        />
      )}

      {/* Create Date Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Cita</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Selecciona un match:</Text>
            <FlatList
              data={matches}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.matchOption,
                    selectedMatch?.match_id === item.match_id && styles.matchSelected,
                  ]}
                  onPress={() => setSelectedMatch(item)}
                >
                  <Image
                    source={{ uri: item.user.profile_photo }}
                    style={styles.matchAvatar}
                  />
                  <Text style={styles.matchName} numberOfLines={1}>
                    {item.user.full_name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.match_id}
              style={styles.matchesList}
            />

            <Text style={styles.modalLabel}>Tipo de cita:</Text>
            <View style={styles.dateTypesRow}>
              {Object.entries(DATE_TYPES).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.dateTypeOption,
                    selectedDateType === key && styles.dateTypeSelected,
                  ]}
                  onPress={() => setSelectedDateType(key)}
                >
                  <Text style={styles.dateTypeEmoji}>{value.emoji}</Text>
                  <Text style={styles.dateTypeLabel}>{value.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Fecha y hora (YYYY-MM-DD HH:MM):</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="Ej: 2025-07-20 19:00"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={proposedDate}
              onChangeText={setProposedDate}
            />

            <TouchableOpacity
              style={styles.createDateButton}
              onPress={handleCreateDate}
              disabled={isCreating}
            >
              <LinearGradient
                colors={['#9D6DF3', '#6B4DE6']}
                style={styles.createButtonGradient}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.createButtonText}>Enviar Solicitud</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  premiumLabel: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 4,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9D6DF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  dateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  dateTypeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dateTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginLeft: 8,
  },
  responseButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  responseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectButton: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  acceptButton: {
    borderColor: '#77DD77',
    backgroundColor: 'rgba(119, 221, 119, 0.1)',
  },
  rejectText: {
    color: '#FF6B6B',
    marginLeft: 6,
  },
  acceptText: {
    color: '#77DD77',
    marginLeft: 6,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  paymentText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  premiumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  premiumIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  premiumDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  paymentMethods: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentMethod: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 8,
  },
  contactText: {
    color: '#9D6DF3',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A3A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 12,
    marginTop: 16,
  },
  matchesList: {
    maxHeight: 100,
  },
  matchOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  matchSelected: {
    borderColor: '#9D6DF3',
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
  },
  matchAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  matchName: {
    color: '#FFFFFF',
    fontSize: 12,
    maxWidth: 60,
    textAlign: 'center',
  },
  dateTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateTypeSelected: {
    borderColor: '#9D6DF3',
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
  },
  dateTypeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  dateTypeLabel: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  dateInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  createDateButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
