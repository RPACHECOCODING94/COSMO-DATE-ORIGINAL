import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { getZodiacInfo } from '../../src/constants/zodiac';

interface Match {
  match_id: string;
  compatibility: number;
  matched_at: string;
  user: {
    id: string;
    full_name: string;
    profile_photo: string;
    zodiac_sign: string;
    bio: string;
  };
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      const response = await api.get('/matches');
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessages = useCallback(async (matchId: string) => {
    try {
      const response = await api.get(`/messages/${matchId}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (selectedMatch) {
      loadMessages(selectedMatch.match_id);
      const interval = setInterval(() => loadMessages(selectedMatch.match_id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedMatch, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || isSending) return;

    setIsSending(true);
    try {
      await api.post('/messages', {
        match_id: selectedMatch.match_id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      loadMessages(selectedMatch.match_id);
      loadMatches();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-MX', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
    }
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    const zodiacInfo = getZodiacInfo(item.user.zodiac_sign);
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => setSelectedMatch(item)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.user.profile_photo }}
            style={styles.avatar}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={[styles.compatibilityDot, { backgroundColor: zodiacInfo.color }]}>
            <Text style={styles.compatibilityDotText}>{item.compatibility}%</Text>
          </View>
        </View>
        <View style={styles.matchInfo}>
          <View style={styles.matchHeader}>
            <Text style={styles.matchName}>{item.user.full_name}</Text>
            {item.last_message_at && (
              <Text style={styles.matchTime}>{formatTime(item.last_message_at)}</Text>
            )}
          </View>
          <View style={styles.matchSubtitle}>
            <Text style={styles.zodiacEmoji}>{zodiacInfo.emoji}</Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message || `${item.user.zodiac_sign} - ${item.compatibility}% compatible`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.matchCount}>{matches.length} conexiones</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💔</Text>
          <Text style={styles.emptyTitle}>No tienes matches aún</Text>
          <Text style={styles.emptySubtitle}>
            Sigue explorando para encontrar tu conexión zodiacal
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.match_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadMatches();
              }}
              tintColor="#9D6DF3"
            />
          }
        />
      )}

      {/* Chat Modal */}
      <Modal visible={!!selectedMatch} animationType="slide">
        <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.chatContainer}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.chatBackButton}
              onPress={() => setSelectedMatch(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            {selectedMatch && (
              <View style={styles.chatHeaderInfo}>
                <Image
                  source={{ uri: selectedMatch.user.profile_photo }}
                  style={styles.chatHeaderAvatar}
                />
                <View>
                  <Text style={styles.chatHeaderName}>{selectedMatch.user.full_name}</Text>
                  <Text style={styles.chatHeaderZodiac}>
                    {getZodiacInfo(selectedMatch.user.zodiac_sign).emoji} {selectedMatch.user.zodiac_sign} - {selectedMatch.compatibility}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Messages */}
          <FlatList
            data={messages}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.sender_id === user?.id ? styles.sentMessage : styles.receivedMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
            inverted={false}
          />

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
              <TextInput
                style={styles.messageInput}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
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
  matchCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#9D6DF3',
  },
  compatibilityDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 36,
    alignItems: 'center',
  },
  compatibilityDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  matchSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zodiacEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
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
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  chatBackButton: {
    padding: 8,
    marginRight: 8,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatHeaderZodiac: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#9D6DF3',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  messageInput: {
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
