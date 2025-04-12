import React, { createContext, useState, useContext, useRef, useEffect, use } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';
import { endpoint } from '../../utils/constants/constants';

// Define API URL based on environment
const API_URL =endpoint;

// Create context
const ScrapbookContext = createContext();

export const useScrapbook = () => useContext(ScrapbookContext);

export const ScrapbookProvider = ({ children }) => {
  const { userToken, userData } = useAuth();
  
  // Socket.io reference
  const socketRef = useRef(null);
  
  // State
  const [scrapbooks, setScrapbooks] = useState([]);
  const [currentScrapbook, setCurrentScrapbook] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (userToken && userData) {
      // Initialize socket connection with auth
      socketRef.current = io(API_URL, {
        auth: {
          token: userToken,
          userId: userData._id
        }
      });
      
      // Connection events
      socketRef.current.on('connect', () => {
        // console.log('Socket connected:', socketRef.current.id);
      });
      
      socketRef.current.on('connect_error', (err) => {
        //console.error('Socket connection error:', err.message);
      });
      
      socketRef.current.on('disconnect', () => {
       // console.log('Socket disconnected');
      });
      
      // Note: We don't need to manually handle preventing duplicate updates
      // The server now won't send our own updates back to us
      
      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [userToken, userData]);
  
  // Setup event handlers for a specific scrapbook
  const setupScrapbookEvents = (scrapbookId) => {
    if (!socketRef.current) return;
    
    // User events
    socketRef.current.on('user-joined', (user) => {
      setActiveUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
    });
    
    socketRef.current.on('user-left', (user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    });
    
    // Item events
    socketRef.current.on('item-added', (item) => {
      setCurrentScrapbook(prev => prev ? {
        ...prev,
        items: [...prev.items, item]
      } : prev);
      setTimeline(prev => [item.timeline, ...prev]);
    });
    
    socketRef.current.on('item-updated', (updatedItem) => {
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => 
            item._id === updatedItem._id ? updatedItem : item
          )
        };
      });
    });
    
    socketRef.current.on('item-removed', ({ itemId,timeline }) => {
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter(item => item._id !== itemId)
        };
      });
      //add to timeline
      setTimeline(prev => [timeline, ...prev]);
    });


    // Title updates
    socketRef.current.on('title-updated', ({ title,timeline }) => {
      setCurrentScrapbook(prev => prev ? { ...prev, title } : prev);
      setTimeline(prev => [timeline, ...prev]);
    });
    
    // Collaborator events
    socketRef.current.on('collaborator-added', ({ collaborator,timeline }) => {
      setCollaborators(prev => [...prev, collaborator]);
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          collaborators: [...prev.collaborators, collaborator]
        };
      });
      //add to timeline
      setTimeline(prev => [timeline, ...prev]);
    });
    
    socketRef.current.on('collaborator-removed', ({ collaboratorId,timeline}) => {
      setCollaborators(prev => prev.filter(c => c._id !== collaboratorId));
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          collaborators: prev.collaborators.filter(c => c._id !== collaboratorId)
        };
      });
      //add to timeline
      setTimeline(prev => [timeline, ...prev]);
    });
    
    // Join this scrapbook room
    socketRef.current.emit('join-scrapbook', scrapbookId);
  };

  const leaveScrapbook = () => {
    if(socketRef.current && currentScrapbook) {
      socketRef.current.emit('leave-scrapbook', currentScrapbook._id);
    }
  }
  
  // Cleanup event handlers when leaving a scrapbook
  const cleanupScrapbookEvents = (scrapbookId) => {
    if (!socketRef.current) return;
    
    socketRef.current.off('user-joined');
    socketRef.current.off('user-left');
    socketRef.current.off('item-added');
    socketRef.current.off('item-updated');
    socketRef.current.off('item-removed');
    socketRef.current.off('title-updated');
    socketRef.current.off('collaborator-added');
    socketRef.current.off('collaborator-removed');
    
    // Leave the room
    socketRef.current.emit('leave-scrapbook', scrapbookId);
  };
  
  // API Functions
  
  // Get all scrapbooks
  const fetchScrapbooks = async () => {
    if (!userToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/scrapbooks`, {
        headers: { 'x-auth-token': userToken }
      });
      
      setScrapbooks(response.data);
      return response.data;
    } catch (error) {
      console.log('Failed to fetch scrapbooks:', error.message);
      const message = error.response?.data?.message || 'Failed to fetch scrapbooks';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  
  // Get a specific scrapbook
  const fetchScrapbook = async (scrapbookId) => {
    if (!userToken || !scrapbookId) return;
    setError(null);
    
    try {
      // If we're switching from one scrapbook to another, clean up previous one
      if (currentScrapbook && currentScrapbook._id !== scrapbookId) {
        cleanupScrapbookEvents(currentScrapbook._id);
      }
      
      const response = await axios.get(`/api/scrapbooks/${scrapbookId}`, {
        headers: { 'x-auth-token': userToken }
      });
      
      setCurrentScrapbook(response.data);
      setCollaborators(response.data.collaborators || []);
      
      // Setup socket events for this scrapbook
      setupScrapbookEvents(scrapbookId);
      
      // Fetch timeline
      fetchTimeline(scrapbookId);
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch scrapbook';
      setError(message);
    }
  };
  
  // Get timeline for a scrapbook
  const fetchTimeline = async (scrapbookId) => {
    if (!userToken || !scrapbookId) return;
    
    try {
      const response = await axios.get(`/api/scrapbooks/${scrapbookId}/timeline`, {
        headers: { 'x-auth-token': userToken }
      });
      
      setTimeline(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      // Don't show alert for timeline errors - non-critical
    }
  };
  
  // Create a new scrapbook
  const createScrapbook = async (title) => {
    if (!userToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `/api/scrapbooks`,
        { title },
        { headers: { 'x-auth-token': userToken } }
      );
      
      setScrapbooks(prev => [response.data, ...prev]);
      return response.data;
    } catch (error) {
      console.log('Error creating scrapbook:', error.message);
      const message = error.response?.data?.message || 'Failed to create scrapbook';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };
  
  // Update scrapbook title
  const updateTitle = async (scrapbookId, title) => {
    if (!userToken || !scrapbookId || !title) return;
    
    setError(null);
    
    try {
      const response = await axios.put(
        `/api/scrapbooks/${scrapbookId}/title`,
        { title },
        { headers: { 'x-auth-token': userToken } }
      );
      
      // Update in state
      setCurrentScrapbook(prev => prev ? { ...prev, title } : prev);
      const {timeline} = response.data;
        setTimeline(prev => [timeline, ...prev]);
      
      // Update in scrapbooks list
      setScrapbooks(prev => prev.map(s => 
        s._id === scrapbookId ? { ...s, title } : s
      ));
      
      // Emit socket event
      if (socketRef.current) {
        socketRef.current.emit('title-updated', { scrapbookId, title });
      }
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update title';
      setError(message);
      Alert.alert('Error', message);
    }
  };
  
  // Add an item to the scrapbook
  const addItem = async (scrapbookId, item) => {
    if (!userToken || !scrapbookId || !item) return;
    
    setError(null);
    
    try {
      const response = await axios.post(
        `/api/scrapbooks/${scrapbookId}/items`,
        item,
        { headers: { 'x-auth-token': userToken } }
      );
      
      const {newItem,timeline} = response.data;
      
      
      // Add to current scrapbook
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...prev.items, newItem]
        };
      });
      // Add to timeline
      setTimeline(prev => [timeline, ...prev]);
      
      // // Emit socket event
      // if (socketRef.current) {
      //   socketRef.current.emit('item-added', { scrapbookId, item: newItem });
      // }
      
      return newItem;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add item';
      setError(message);
      Alert.alert('Error', message);
    }
  };
  
  // Remove an item from the scrapbook
  const removeItem = async (scrapbookId, itemId) => {
    if (!userToken || !scrapbookId || !itemId) return;
    
    setError(null);
    
    try {
      const res=await axios.delete(
        `/api/scrapbooks/${scrapbookId}/items/${itemId}`,
        { headers: { 'x-auth-token': userToken } }
      );
      const {timeline} = res.data;
      // Remove from current scrapbook
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter(item => item._id !== itemId)
        };
      });

      //add to timeline
      setTimeline(prev => [timeline, ...prev]);
      
      // Emit socket event
      if (socketRef.current) {
        socketRef.current.emit('item-removed', { scrapbookId, itemId });
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove item';
      setError(message);
      Alert.alert('Error', message);
    }
  };
  
  // Add a collaborator to the scrapbook
  const addCollaborator = async (scrapbookId, username) => {
    if (!userToken || !scrapbookId || !username) return;
    
    setError(null);
    
    try {
      const response = await axios.post(
        `/api/scrapbooks/${scrapbookId}/collaborators`,
        { username },
        { headers: { 'x-auth-token': userToken } }
      );
      
      const { collaborator,timeline } = response.data;
      
      // Add to collaborators list
      setCollaborators(prev => [...prev, collaborator]);
      
      // Add to current scrapbook
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          collaborators: [...prev.collaborators, collaborator]
        };
      });

      // Add to timeline
      setTimeline(prev => [timeline, ...prev]);

      // Emit socket event
      if (socketRef.current) {
        socketRef.current.emit('collaborator-added', { scrapbookId, collaborator });
      }
      
      return collaborator;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add collaborator';
      setError(message);
      Alert.alert('Error', message);
    }
  };
  
  // Remove a collaborator from the scrapbook
  const removeCollaborator = async (scrapbookId, collaboratorId) => {
    if (!userToken || !scrapbookId || !collaboratorId) return;
    
    setError(null);
    
    try {
      const res=await axios.delete(
        `/api/scrapbooks/${scrapbookId}/collaborators/${collaboratorId}`,
        { headers: { 'x-auth-token': userToken } }
      );
      
      // Remove from collaborators list
      setCollaborators(prev => prev.filter(c => c._id !== collaboratorId));
      
      // Remove from current scrapbook
      setCurrentScrapbook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          collaborators: prev.collaborators.filter(c => c._id !== collaboratorId)
        };
      });
      //add to timeline
      const {timeline} = res.data;
      setTimeline(prev => [timeline, ...prev]);
      // Emit socket event
      if (socketRef.current) {
        socketRef.current.emit('collaborator-removed', { scrapbookId, collaboratorId });
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove collaborator';
      setError(message);
      Alert.alert('Error', message);
    }
  };
  
  // Clear current scrapbook (when navigating away)
  const clearCurrentScrapbook = () => {
    if (currentScrapbook) {
      cleanupScrapbookEvents(currentScrapbook._id);
    }
    setCurrentScrapbook(null);
    setCollaborators([]);
    setTimeline([]);
    setActiveUsers([]);
  };
  
  return (
    <ScrapbookContext.Provider value={{
      scrapbooks,
      currentScrapbook,
      collaborators,
      timeline,
      activeUsers,
      loading,
      error,
      fetchScrapbooks,
      fetchScrapbook,
      fetchTimeline,
      createScrapbook,
      updateTitle,
      addItem,
      removeItem,
      addCollaborator,
      removeCollaborator,
      clearCurrentScrapbook,
      leaveScrapbook,
    }}>
      {children}
    </ScrapbookContext.Provider>
  );
};
