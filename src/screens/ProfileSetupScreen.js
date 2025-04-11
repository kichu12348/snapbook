import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ProfileSetupScreen = ({ navigation, route }) => {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const { email } = route.params || {};

  // Animation values
  const containerOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.5);
  const inputTranslateY = useSharedValue(50);
  const buttonTranslateY = useSharedValue(100);

  // Start animations when component mounts
  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 800 });
    avatarScale.value = withSequence(
      withDelay(200, withTiming(1.1, { duration: 300 })),
      withTiming(1, { duration: 200 })
    );
    inputTranslateY.value = withDelay(400, withTiming(0, { duration: 500 }));
    buttonTranslateY.value = withDelay(600, withTiming(0, { duration: 500 }));
  }, []);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const avatarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarScale.value }],
    };
  });

  const inputAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: inputTranslateY.value }],
      opacity: withTiming(inputTranslateY.value === 0 ? 1 : 0, { duration: 300 }),
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: buttonTranslateY.value }],
      opacity: withTiming(buttonTranslateY.value === 0 ? 1 : 0, { duration: 300 }),
    };
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        "Permission needed", 
        "We need permission to access your photos to set a profile picture."
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      // Animate avatar when selected
      avatarScale.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 150 })
      );
    }
  };

  const completeSetup = async () => {
    if (!username.trim()) {
      Alert.alert(
        "Username Required",
        "Please enter a unique username to continue"
      );
      return;
    }

    try {
      // In a real app, you'd validate and send this to your backend
      // For now, just save to AsyncStorage
      await AsyncStorage.setItem('userToken', 'mock-token');
      await AsyncStorage.setItem('username', username);
      if (avatar) {
        await AsyncStorage.setItem('userAvatar', avatar);
      }

      // Navigate to the dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (error) {
      console.log('Error saving profile:', error);
      Alert.alert(
        "Error", 
        "There was a problem saving your profile. Please try again."
      );
    }
  };

  return (
    <LinearGradient
      colors={['#0A0F24', '#2A1E5C']}
      style={styles.container}
    >
      <Animated.ScrollView 
        style={[styles.scrollView, containerAnimatedStyle]} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Show the dreamy world who you are</Text>
        </View>
        
        <Animated.View style={[styles.avatarContainer, avatarAnimatedStyle]}>
          <TouchableOpacity onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={54} color="#5C6BC0" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <LinearGradient
                colors={['#5C6BC0', '#9575CD']}
                style={styles.editIconGradient}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>Tap to select a profile picture</Text>
        </Animated.View>
        
        <Animated.View style={[styles.formContainer, inputAnimatedStyle]}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Choose a unique username"
            placeholderTextColor="#9575CD"
            value={username}
            onChangeText={setUsername}
            maxLength={20}
            autoCapitalize="none"
          />
          
          {email && (
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          )}
        </Animated.View>
        
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity onPress={completeSetup} style={styles.completeButton}>
            <LinearGradient
              colors={['#5C6BC0', '#9575CD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text style={styles.buttonText}>Complete Setup</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => {
              // Just save a token and go to Dashboard
              AsyncStorage.setItem('userToken', 'mock-token').then(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              });
            }}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFCA80',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#5C6BC0',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(42, 30, 92, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(92, 107, 192, 0.3)',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  editIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0F24',
  },
  avatarHelpText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9575CD',
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(42, 30, 92, 0.5)',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(92, 107, 192, 0.3)',
  },
  emailContainer: {
    marginTop: 20,
  },
  emailLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  emailValue: {
    fontSize: 16,
    color: '#9575CD',
    backgroundColor: 'rgba(42, 30, 92, 0.5)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(92, 107, 192, 0.3)',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  completeButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 15,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    color: '#9575CD',
    fontSize: 14,
  },
});

export default ProfileSetupScreen;
