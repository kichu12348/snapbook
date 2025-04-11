import React, { useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScrapbookCard from "../components/ScrapbookCard";
import { useScrapbook } from "../context/ScrapbookContext";
import { useAuth } from "../context/AuthContext";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const StarySkyBackground = () => {
  const arrSize = 100;
  return (
    <View style={styles.starsContainer}>
      {Array.from({ length: arrSize }).map((_, index) => {
        const x = Math.random() * width;
        const y = Math.random() * (Dimensions.get("window").height - 100) + 100;
        const size = Math.random() * 3 + 1;
        return (
          <View
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "#FFFFFF",
              opacity: Math.random(),
            }}
          />
        );
      })}
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  // For floating animation of the header and add button
  const headerOffsetY = useSharedValue(-50);
  const addButtonScale = useSharedValue(0);
  const addButtonRotate = useSharedValue(0);

  const { userData } = useAuth();
  const { scrapbooks, loading, fetchScrapbooks, createScrapbook } = useScrapbook();
  const [refreshing, setRefreshing] = React.useState(false);

  const MemoizedStarySkyBackground = useMemo(() => {
    return <StarySkyBackground />;
  }, []);

  useEffect(() => {
    // Animate header and button on mount
    headerOffsetY.value = withSpring(0, { damping: 15 });
    addButtonScale.value = withDelay(500, withSpring(1, { damping: 10 }));

    // Add a subtle rotation animation to the add button
    addButtonRotate.value = withDelay(
      800,
      withTiming(360, { duration: 1200, easing: Easing.elastic(1) })
    );

    // Fetch scrapbooks data from API
    fetchScrapbooks();
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: headerOffsetY.value }],
      opacity: withTiming(1, { duration: 800 }),
    };
  });

  const addButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: addButtonScale.value },
        { rotate: `${addButtonRotate.value}deg` },
      ],
    };
  });

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchScrapbooks();
    } finally {
      setRefreshing(false);
    }
  }, [fetchScrapbooks]);

  const renderItem = ({ item, index }) => {
    // Convert backend data format to what ScrapbookCard expects
    const formattedScrapbook = {
      id: item._id,
      title: item.title,
      cover: item.items && item.items.length > 0 && item.items.some(i => i.type === 'image') 
        ? item.items.find(i => i.type === 'image').content 
        : 'https://images.unsplash.com/photo-1501785888041-af3ef285b470', // Default image if no images in scrapbook
      date: new Date(item.updatedAt || item.createdAt).toLocaleDateString(),
      collaborators: Array.isArray(item.collaborators) ? item.collaborators.length : 0,
      imageCount: item.items ? item.items.filter(i => i.type === 'image').length : 0,
      owner: item.owner
    };

    return (
      <ScrapbookCard
        scrapbook={formattedScrapbook}
        index={index}
        onPress={() =>
          navigation.navigate("ScrapbookEditor", {
            scrapbookId: item._id,
            title: item.title,
            isNew: false
          })
        }
      />
    );
  };

  const handleCreateScrapbook = async () => {
    try {
      const result = await createScrapbook("New Scrapbook");
      if (result) {
        navigation.navigate("ScrapbookEditor", {
          scrapbookId: result._id,
          title: result.title,
          isNew: false
        });
      }
    } catch (error) {
      console.error("Failed to create scrapbook:", error);
    }
  };

  const handleMoveToProfile = () => navigation.navigate("ProfileScreen");

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No scrapbooks yet</Text>
      <Text style={styles.emptySubText}>
        Create your first scrapbook to get started
      </Text>
    </View>
  );

  const renderLoader = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
        <Text style={styles.loaderText}>Loading scrapbooks...</Text>
      </View>
    );
  };

  return (
    <>
      <LinearGradient
        colors={[
          "#000000",
          "#000000",
          "#000000",
          "#000000",
          "#050011",
          "#0A0022",
          "#0F0033",
          "#140044",
        ]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {MemoizedStarySkyBackground}
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.titleText}>SnapBook</Text>
              {userData && (
                <Text style={styles.welcomeText}>Welcome, {userData.username}</Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleMoveToProfile}
            >
              {userData && userData.avatar ? (
                <Image 
                  source={{ uri: userData.avatar }}
                  style={styles.profileAvatar}
                  cachePolicy="memory-disk"
                  transition={300}
                />
              ) : (
                <MaterialCommunityIcons
                  name="face-man"
                  size={30}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {renderLoader()}

        {!loading && (
          <FlatList
            data={scrapbooks}
            renderItem={renderItem}
            keyExtractor={(item) => item._id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[
              styles.listContent,
              scrapbooks?.length === 0 && styles.emptyList
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#5C6BC0"
                colors={["#5C6BC0", "#9575CD"]}
                progressBackgroundColor="#0A0022"
              />
            }
          />
        )}

        <Animated.View style={[styles.floatingButton, addButtonAnimatedStyle]}>
          <TouchableOpacity onPress={handleCreateScrapbook} activeOpacity={0.8}>
            <LinearGradient
              colors={["#5C6BC0", "#9575CD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  welcomeText: {
    fontSize: 16,
    color: "#9575CD",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: "#FFCA80",
  },
  logoutButton: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#9575CD",
    textAlign: "center",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    shadowColor: "#5C6BC0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: Dimensions.get("window").height - 100,
    overflow: "hidden",
    zIndex: 0,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#5C6BC0",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default DashboardScreen;
