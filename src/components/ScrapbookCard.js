import React, { use, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useScrapbook } from "../context/ScrapbookContext";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

const ScrapbookCard = ({ scrapbook, index, onPress }) => {
  // Height variants for masonry layout
  const heights = [220, 260, 200, 240];
  const height = heights[index % heights.length];
  const { deleteScrapBook, currentScrapbook } = useScrapbook();

  // Simplified animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const deleteOverlayOpacity = useSharedValue(0);
  const deleteOverlayScale = useSharedValue(0);

  useEffect(() => {
    // Staggered appearance
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 500 }));

    // Simple scale animation
    scale.value = withDelay(
      index * 100,
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  // Ensure we have a valid cover image
  const coverImage =
    scrapbook.cover ||
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470";

  const deleteOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteOverlayOpacity.value,
      transform: [{ scale: deleteOverlayScale.value }],
    };
  });

  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] =
    React.useState(false);

  const handleDeleteOverlayAppear = () => {
    setIsDeleteOverlayVisible(true);
    deleteOverlayOpacity.value = withTiming(1, { duration: 300 });
    deleteOverlayScale.value = withTiming(1, { duration: 300 });
  };

  const handleDeleteOverlayDisappear = () => {
    deleteOverlayOpacity.value = withTiming(0, { duration: 300 });
    deleteOverlayScale.value = withTiming(0, { duration: 300 });
    setIsDeleteOverlayVisible(false);
  };

  const handleDeleteOverlayToggle = () => {
    if (isDeleteOverlayVisible) {
      handleDeleteOverlayDisappear();
    } else {
      handleDeleteOverlayAppear();
    }
  };

  const handleDelete = async () => {
    handleDeleteOverlayDisappear();
    await deleteScrapBook(scrapbook._id);
  };

  useEffect(() => {
    const isCurrentScrapbook = currentScrapbook?._id === scrapbook._id;
    if (!isCurrentScrapbook) {
      handleDeleteOverlayDisappear();
    }
  }, [currentScrapbook]);

  const DeleteOverlay = () => {
    //if (!isDeleteOverlayVisible) return null;
    return (
      <Animated.View style={[styles.deleteOverlay, deleteOverlayStyle]}>
        <TouchableOpacity
          onPress={handleDeleteOverlayToggle}
          activeOpacity={1}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#FFCA80" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.container, { height }, animatedStyle]}>
      <TouchableOpacity
        style={[styles.card, { height }]}
        onPress={onPress}
        activeOpacity={0.9}
        onLongPress={handleDeleteOverlayToggle}
        delayLongPress={300}
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
            <Text style={styles.title} numberOfLines={2}>
              {scrapbook.title}
            </Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>{scrapbook.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>
                {scrapbook.collaborators}{" "}
                {scrapbook.collaborators === 1
                  ? "collaborator"
                  : "collaborators"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="images-outline" size={14} color="#FFCA80" />
              <Text style={styles.infoText}>
                {scrapbook.imageCount}{" "}
                {scrapbook.imageCount === 1 ? "image" : "images"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <DeleteOverlay />
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
    overflow: "hidden",
    backgroundColor: "#2A1E5C",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 15, 36, 0.6)",
    justifyContent: "flex-end",
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  deleteOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
    ...StyleSheet.absoluteFillObject,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    alignSelf: "center",
  },
  deleteButtonText: {
    color: "#FFCA80",
    fontSize: 16,
    marginLeft: 8,
  },
  deleteButtonIcon: {
    color: "#FFCA80",
  },
});

export default ScrapbookCard;
