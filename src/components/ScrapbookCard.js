import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const ScrapbookCard = ({ scrapbook, index, onPress }) => {
  // Height variants for masonry layout
  const heights = [220, 260, 200, 240];
  const height = heights[index % heights.length];
  
  // Simplified animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  
  useEffect(() => {
    // Staggered appearance
    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 500 })
    );
    
    // Simple scale animation
    scale.value = withDelay(
      index * 100,
      withTiming(1, { 
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      })
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value }
      ]
    };
  });

  // Ensure we have a valid cover image
  const coverImage = scrapbook.cover || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470';

  return (
    <Animated.View style={[
      styles.container,
      { height },
      animatedStyle
    ]}>
      <TouchableOpacity
        style={[styles.card, { height }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          contentFit="cover"
          transition={1000}
          cachePolicy={"memory-disk"}
        />
        <View style={styles.overlay}>
          <View style={styles.contentContainer}>
            <Text style={styles.title} numberOfLines={2}>{scrapbook.title}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>{scrapbook.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>
                {scrapbook.collaborators} {scrapbook.collaborators === 1 ? 'collaborator' : 'collaborators'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="images-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>
                {scrapbook.imageCount} {scrapbook.imageCount === 1 ? 'image' : 'images'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A1E5C',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 36, 0.6)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  }
});

export default ScrapbookCard;
