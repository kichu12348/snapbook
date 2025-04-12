import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { endpoint } from '../../utils/constants/constants';

// Define API URL based on environment
const API_URL = endpoint;

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Create axios instance with request/response interceptors
const api = axios.create();

// Request interceptor to add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Create context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating , setIsUpdating] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  // Check if user is logged in on app startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const user = await AsyncStorage.getItem('userData');
        
        if (token && user) {
          setUserToken(token);
          setUserData(JSON.parse(user));
          
          // Verify token is still valid by making a request to the server
          validateToken(token);
        }
      } catch (e) {
        console.log("Error restoring auth state:", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Validate token with the server
  const validateToken = async (token) => {
    try {
      const response = await axios.get('/api/users/me', {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Token is valid, update user data
      setUserData(response.data);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    } catch (error) {
      // Token is invalid, log out the user
      if (error.response && error.response.status === 401) {
        signOut();
      }
      console.log("Token validation error:", error);
      // If we can't reach the server, keep the user logged in for now
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // const response = await axios.post('/api/auth/login', {
      //   email,
      //   password
      // });
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      const { token, user } = response.data;
      
      // Store token and user data
      setUserToken(token);
      setUserData(user);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.log("Sign in error:", error.message);
      handleApiError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email, password, username, avatar = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        username,
        avatar
      });
      
      const { token, user } = response.data;
      
      // Store token and user data
      setUserToken(token);
      setUserData(user);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true);
    
    try {
      // Remove token and user data from storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Clear state
      setUserToken(null);
      setUserData(null);
    } catch (error) {
      console.log("Sign out error:", error);
      Alert.alert("Error", "There was a problem signing out");
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    if(isUpdating) return; // Prevent multiple updates at once
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await api.put('/api/users/me', userData, {
        headers: {
          'x-auth-token': userToken
        }
      });

      
      
      // Update user data
      setUserData(response.data.user);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to handle axios errors
  const handleApiError = (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      setError(error.response.data.message || 'Server error');
    } else if (error.request) {
      // The request was made but no response was received
      setError('Network error. Please check your internet connection.');
    } else {
      // Something happened in setting up the request
      setError(error.message || 'An error occurred');
    }
  };

  return (
    <AuthContext.Provider value={{
      isLoading,
      userToken,
      userData,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
