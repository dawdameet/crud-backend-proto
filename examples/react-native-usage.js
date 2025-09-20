// React Native Authentication Service Example
// This file shows how to integrate with the authentication backend

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api'; // Change to your server URL

class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Initialize service by loading stored tokens
  async initialize() {
    try {
      this.accessToken = await AsyncStorage.getItem('accessToken');
      this.refreshToken = await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        await this.storeTokens(data.data.accessToken, data.data.refreshToken);
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message, errors: data.errors };
      }
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  }

  // Login user
  async login(identifier, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (data.success) {
        await this.storeTokens(data.data.accessToken, data.data.refreshToken);
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.accessToken && this.refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        await this.storeTokens(data.data.accessToken, data.data.refreshToken);
        return { success: true };
      } else {
        await this.clearTokens();
        return { success: false, message: data.message };
      }
    } catch (error) {
      await this.clearTokens();
      return { success: false, message: 'Token refresh failed' };
    }
  }

  // Make authenticated API request
  async authenticatedRequest(url, options = {}) {
    try {
      // Ensure we have a valid access token
      if (!this.accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          ...options.headers,
        },
      });

      // If token expired, try to refresh
      if (response.status === 401) {
        const refreshResult = await this.refreshAccessToken();
        
        if (refreshResult.success) {
          // Retry the original request with new token
          return await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.accessToken}`,
              ...options.headers,
            },
          });
        } else {
          throw new Error('Authentication failed');
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await this.authenticatedRequest('/user/profile');
      const data = await response.json();
      
      if (data.success) {
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Failed to get profile' };
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await this.authenticatedRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Failed to update profile' };
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.authenticatedRequest('/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Password changed successfully, user needs to login again
        await this.clearTokens();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Failed to change password' };
    }
  }

  // Check if username/email is available
  async checkAvailability(username, email) {
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (email) params.append('email', email);

      const response = await fetch(`${API_BASE_URL}/auth/check-availability?${params}`);
      const data = await response.json();
      
      if (data.success) {
        return { success: true, available: data.data.available };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Failed to check availability' };
    }
  }

  // Store tokens securely
  async storeTokens(accessToken, refreshToken) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  // Clear stored tokens
  async clearTokens() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Validate current token
  async validateToken() {
    try {
      const response = await this.authenticatedRequest('/auth/validate-token');
      const data = await response.json();
      
      return data.success;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export default new AuthService();

// Example usage in React Native components:

/*
import AuthService from './AuthService';

// In your login component
const handleLogin = async (identifier, password) => {
  const result = await AuthService.login(identifier, password);
  
  if (result.success) {
    // Navigate to authenticated screens
    navigation.navigate('Home');
  } else {
    // Show error message
    Alert.alert('Login Failed', result.message);
  }
};

// In your registration component
const handleRegister = async (userData) => {
  const result = await AuthService.register(userData);
  
  if (result.success) {
    // Navigate to authenticated screens
    navigation.navigate('Home');
  } else {
    // Show error message
    Alert.alert('Registration Failed', result.message);
  }
};

// In your profile component
const loadProfile = async () => {
  const result = await AuthService.getProfile();
  
  if (result.success) {
    setUser(result.user);
  } else {
    // Handle error
    console.error('Failed to load profile:', result.message);
  }
};

// Initialize service when app starts
useEffect(() => {
  AuthService.initialize();
}, []);
*/
