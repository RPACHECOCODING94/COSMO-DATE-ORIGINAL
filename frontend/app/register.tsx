import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';

const GENDERS = [
  { value: 'masculino', label: 'Masculino', icon: 'male' },
  { value: 'femenino', label: 'Femenino', icon: 'female' },
  { value: 'otros', label: 'Otros', icon: 'transgender' },
];

const DISCLAIMER_TEXT = `AVISO DE RESPONSABILIDAD

Al registrarte en Cosmo Date, aceptas los siguientes términos:

1. Confirmo que soy mayor de 18 años.

2. La información proporcionada es verdadera y me hago responsable de ella.

3. Este servicio está disponible exclusivamente para residentes de Hermosillo, Sonora, México.

4. Cosmo Date no se hace responsable por las interacciones entre usuarios.

5. Me comprometo a usar la plataforma de manera respetuosa.

6. Entiendo que mis datos serán utilizados únicamente para el funcionamiento de la app.

Ubicación del servicio: Hermosillo, Sonora, México.`;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    curp: '',
    email: '',
    phone: '',
    password: '',
    profile_photo: '',
    gender: '',
    disclaimer_accepted: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
      updateField('profile_photo', `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Error', 'Ingresa tu nombre completo');
      return false;
    }
    if (!formData.date_of_birth.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Ingresa tu fecha de nacimiento (AAAA-MM-DD)');
      return false;
    }
    // Validate age
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      Alert.alert('Error', 'Debes tener al menos 18 años para registrarte');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$/;
    if (!curpRegex.test(formData.curp.toUpperCase())) {
      Alert.alert('Error', 'Formato de CURP inválido');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Ingresa un correo electrónico válido');
      return false;
    }
    if (formData.phone.length < 10) {
      Alert.alert('Error', 'Ingresa un número de teléfono válido');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.password.match(/^[a-zA-Z0-9]{6,10}$/)) {
      Alert.alert('Error', 'La contraseña debe ser alfanumérica de 6-10 caracteres');
      return false;
    }
    if (!formData.profile_photo) {
      Alert.alert('Error', 'Selecciona una foto de perfil');
      return false;
    }
    if (!formData.gender) {
      Alert.alert('Error', 'Selecciona tu género');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setShowDisclaimer(true);
  };

  const handleRegister = async () => {
    if (!formData.disclaimer_accepted) {
      Alert.alert('Error', 'Debes aceptar el aviso de responsabilidad');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      Alert.alert(
        '¡Registro exitoso!',
        'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Información Personal</Text>
      <Text style={styles.stepSubtitle}>Paso 1 de 3</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.full_name}
          onChangeText={(v) => updateField('full_name', v)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="calendar-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Fecha de nacimiento (AAAA-MM-DD)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.date_of_birth}
          onChangeText={(v) => updateField('date_of_birth', v)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#6BB3FF" />
        <Text style={styles.infoText}>Debes ser mayor de 18 años para registrarte</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Datos de Contacto</Text>
      <Text style={styles.stepSubtitle}>Paso 2 de 3</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="card-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="CURP (18 caracteres)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.curp}
          onChangeText={(v) => updateField('curp', v.toUpperCase())}
          maxLength={18}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.phone}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Tu Perfil</Text>
      <Text style={styles.stepSubtitle}>Paso 3 de 3</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#9D6DF3" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (6-10 caracteres)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={formData.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry={!showPassword}
          maxLength={10}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        {formData.profile_photo ? (
          <Image source={{ uri: formData.profile_photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={40} color="#9D6DF3" />
            <Text style={styles.photoText}>Agregar foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.genderLabel}>Selecciona tu género:</Text>
      <View style={styles.genderContainer}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[
              styles.genderOption,
              formData.gender === g.value && styles.genderSelected,
            ]}
            onPress={() => updateField('gender', g.value)}
          >
            <Ionicons
              name={g.icon as any}
              size={24}
              color={formData.gender === g.value ? '#9D6DF3' : 'rgba(255,255,255,0.5)'}
            />
            <Text
              style={[
                styles.genderText,
                formData.gender === g.value && styles.genderTextSelected,
              ]}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#0A0A1A', '#1A1A3A', '#2A1A4A']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.progressBar}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[styles.progressDot, s <= step && styles.progressDotActive]}
                />
              ))}
            </View>
          </View>

          {/* Steps */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Next Button */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={['#9D6DF3', '#6B4DE6']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {step === 3 ? 'Continuar' : 'Siguiente'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Disclaimer Modal */}
        <Modal visible={showDisclaimer} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Aviso de Responsabilidad</Text>
              <ScrollView style={styles.disclaimerScroll}>
                <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDisclaimer(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => {
                    updateField('disclaimer_accepted', true);
                    setShowDisclaimer(false);
                    handleRegister();
                  }}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#9D6DF3', '#6B4DE6']}
                    style={styles.acceptButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Acepto</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: '#9D6DF3',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 179, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    color: '#6BB3FF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  photoButton: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#9D6DF3',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(157, 109, 243, 0.5)',
    borderStyle: 'dashed',
  },
  photoText: {
    color: '#9D6DF3',
    fontSize: 12,
    marginTop: 8,
  },
  genderLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(157, 109, 243, 0.3)',
  },
  genderSelected: {
    borderColor: '#9D6DF3',
    backgroundColor: 'rgba(157, 109, 243, 0.2)',
  },
  genderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  genderTextSelected: {
    color: '#9D6DF3',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 30,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  disclaimerScroll: {
    maxHeight: 300,
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
