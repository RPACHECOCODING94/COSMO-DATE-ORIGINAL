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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';

interface TicketMessage {
  id: string;
  sender_name: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
}

const SUPPORT_PHONE = "+52 662 XXX XXXX"; // Placeholder for support phone

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const response = await api.get('/support/tickets');
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/support/tickets', {
        subject: newSubject.trim(),
        message: newMessage.trim(),
      });
      Alert.alert('Éxito', 'Ticket creado correctamente');
      setShowCreateModal(false);
      setNewSubject('');
      setNewMessage('');
      loadTickets();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al crear ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyToTicket = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setIsSubmitting(true);
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/message`, {
        ticket_id: selectedTicket.id,
        message: replyMessage.trim(),
      });
      setReplyMessage('');
      loadTickets();
      // Refresh selected ticket
      const updatedTickets = await api.get('/support/tickets');
      const updated = updatedTickets.data.tickets.find((t: SupportTicket) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    } catch (error) {
      console.error('Error replying:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#77DD77';
      case 'in_progress': return '#FFB347';
      case 'closed': return '#888';
      default: return '#888';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En proceso';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const renderTicketItem = ({ item }: { item: SupportTicket }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => setSelectedTicket(item)}
    >
      <View style={styles.ticketHeader}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#9D6DF3" />
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketSubject}>{item.subject}</Text>
          <Text style={styles.ticketDate}>
            {new Date(item.created_at).toLocaleDateString('es-MX')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.ticketPreview} numberOfLines={2}>
        {item.messages[item.messages.length - 1]?.content || ''}
      </Text>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Soporte</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Support Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="call" size={24} color="#9D6DF3" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Teléfono de contacto</Text>
          <Text style={styles.infoPhone}>{SUPPORT_PHONE}</Text>
        </View>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={60} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No tienes tickets</Text>
          <Text style={styles.emptySubtitle}>
            ¿Tienes alguna duda o problema? Crea un ticket de soporte.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTickets();
              }}
              tintColor="#9D6DF3"
            />
          }
        />
      )}

      {/* Create Ticket Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Ticket</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Asunto:</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe brevemente tu problema"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <Text style={styles.modalLabel}>Mensaje:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Explica tu problema o duda con detalle"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateTicket}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['#9D6DF3', '#6B4DE6']}
                style={styles.submitButtonGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Enviar Ticket</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal visible={!!selectedTicket} animationType="slide">
        <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.ticketDetailContainer}>
          <View style={[styles.ticketDetailHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedTicket(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.ticketDetailInfo}>
              <Text style={styles.ticketDetailSubject}>{selectedTicket?.subject}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTicket?.status || '') }]}>
                <Text style={styles.statusText}>{getStatusText(selectedTicket?.status || '')}</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={selectedTicket?.messages || []}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.is_admin ? styles.adminMessage : styles.userMessage,
                ]}
              >
                <Text style={styles.messageSender}>
                  {item.is_admin ? 'Soporte' : 'Tú'}
                </Text>
                <Text style={styles.messageContent}>{item.content}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.created_at).toLocaleString('es-MX')}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.replyContainer, { paddingBottom: insets.bottom + 10 }]}>
              <TextInput
                style={styles.replyInput}
                placeholder="Escribe una respuesta..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyMessage}
                onChangeText={setReplyMessage}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !replyMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleReplyToTicket}
                disabled={!replyMessage.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9D6DF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 109, 243, 0.15)',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
  },
  infoTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  infoPhone: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ticketDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
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
  ticketPreview: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
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
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketDetailContainer: {
    flex: 1,
  },
  ticketDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  ticketDetailInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketDetailSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#9D6DF3',
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginBottom: 4,
  },
  messageContent: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9D6DF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
