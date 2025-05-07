import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { useAuth } from "../context/AuthContext";
import { useScrapbook } from "../context/ScrapbookContext";
import { uploadImage } from "../../utils/upload";
import { StatusBar } from "expo-status-bar";
import { RefreshControl } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");
const AVATAR_SIZE = 110;

// Cosmic particles effect component
const CosmicEffect = React.memo(() => {
  return (
    <View style={styles.particlesContainer}>
      {Array.from({ length: 100 }).map((_, index) => {
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.3 + 0.05;
        const top = Math.random() * height;
        const left = Math.random() * width;

        return (
          <Animated.View
            key={index}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "#FFFFFF",
              opacity: opacity,
              top: top,
              left: left,
            }}
          />
        );
      })}
    </View>
  );
});

const ScrapbookCard = ({ scrapbook, onPress }) => {
  const scaleAnim = useSharedValue(0.96);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const onPressIn = () => {
    scaleAnim.value = withTiming(0.98, { duration: 150 });
  };

  const onPressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 200 });
  };

  return (
    <Animated.View style={[styles.scrapbookCard, animatedCardStyle]}>
      <TouchableOpacity
        style={styles.scrapbookCardInner}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: scrapbook.cover }}
          style={styles.scrapbookCover}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.9)"]}
          style={styles.scrapbookOverlay}
        >
          <Text style={styles.scrapbookTitle} numberOfLines={1}>
            {scrapbook.title}
          </Text>
          <View style={styles.scrapbookMetaRow}>
            <View style={styles.scrapbookMetaItem}>
              <Ionicons name="images-outline" size={14} color="#5C6BC0" />
              <Text style={styles.scrapbookMetaText}>
                {scrapbook.imageCount}
              </Text>
            </View>
            <View style={styles.scrapbookMetaItem}>
              <Ionicons name="people-outline" size={14} color="#5C6BC0" />
              <Text style={styles.scrapbookMetaText}>
                {scrapbook.collaborators}
              </Text>
            </View>
            <View style={styles.scrapbookMetaItem}>
              <Ionicons name="time-outline" size={14} color="#5C6BC0" />
              <Text style={styles.scrapbookMetaText}>{scrapbook.date}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const BlurComponent = React.memo(({ blur = 20 }) => {
  return (
    <BlurView
      intensity={blur}
      experimentalBlurMethod="dimezisBlurView"
      blurReductionFactor={12}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        ...StyleSheet.absoluteFillObject,
      }}
      tint="dark"
    />
  );
});

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userData, signOut, updateProfile } = useAuth();
  const { scrapbooks, loading, fetchScrapbooks, createScrapbook } =
    useScrapbook();

  const [refreshing, setRefreshing] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(
    userData?.username || ""
  );

  // Custom modal states
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);

  const [start, setStart] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollRef = useRef(null);

  // Animation values
  const avatarScale = useSharedValue(1);
  const statsSectionOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const fabScale = useSharedValue(0);

  // Initialize animations
  useEffect(() => {
    statsSectionOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 800 })
    );
    contentOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    fabScale.value = withDelay(700, withSpring(1, { damping: 12 }));

    //fetchScrapbooks();
  }, []);

  // Handle scroll animation
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 10 && !hasScrolled) setHasScrolled(true);
    if (offsetY < 10 && hasScrolled) setHasScrolled(false);
    scrollY.value = offsetY;
  };

  // Avatar animation based on scroll
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 150],
      [0, -20],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Header animation based on scroll
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 120],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Stats section animation
  const statsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: statsSectionOpacity.value,
      transform: [
        {
          translateY: interpolate(
            statsSectionOpacity.value,
            [0, 1],
            [50, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // Content animation
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [
        {
          translateY: interpolate(
            contentOpacity.value,
            [0, 1],
            [30, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // FAB animation
  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fabScale.value }],
    };
  });

  // Refresh scrapbooks
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchScrapbooks();
    } finally {
      setRefreshing(false);
    }
  };

  // Confirm logout
  const confirmLogout = () => {
    setLogoutModalVisible(false);
    signOut();
  };

  // Show error modal
  const showError = (message) => {
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Pick avatar image
  const pickAvatar = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showError("We need access to your photos to set a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const avatarUri = result.assets[0].uri;
        if (!avatarUri) return;
        // Animate avatar while updating
        avatarScale.value = withSequence(
          withTiming(0.9, { duration: 150 }),
          withTiming(1.1, { duration: 300 }),
          withTiming(1, {
            duration: 200,
            easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
          })
        );
        const uri = await uploadImage(avatarUri);
        await updateProfile({ avatar: uri });
      }
    } catch (error) {
      console.log(error.message);
      showError("Failed to update profile picture. Please try again.");
    }
  };

  // Save username
  const saveUsername = async () => {
    if (!editedUsername.trim()) {
      showError("Username cannot be empty. Please enter a valid username.");
      return;
    }

    try {
      await updateProfile({ username: editedUsername });
      setIsEditingUsername(false);
    } catch (error) {
      showError("Failed to update username. Please try again.");
    }
  };

  // Create new scrapbook
  const handleCreateScrapbook = async () => {
    try {
      fabScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 150 })
      );

      const result = await createScrapbook("New Scrapbook");
      if (result) {
        navigation.navigate("ScrapbookEditor", {
          scrapbookId: result._id,
          title: result.title,
          isNew: false,
        });
      }
    } catch (error) {
      showError("Failed to create scrapbook. Please try again.");
    }
  };

  // Prepare scrapbook data for display
  const myScrapbooks =
    scrapbooks?.filter((s) => s.owner._id === userData?._id) || [];
  const collaboratingScrapbooks =
    scrapbooks?.filter((s) => s.owner._id !== userData?._id) || [];

  // Format scrapbooks for display
  const formatScrapbook = (item) => ({
    _id: item._id,
    title: item.title,
    cover:
      item.items &&
      item.items.length > 0 &&
      item.items.some((i) => i.type === "image")
        ? item.items.find((i) => i.type === "image").content
        : "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    date: new Date(item.updatedAt || item.createdAt).toLocaleDateString(),
    collaborators: Array.isArray(item.collaborators)
      ? item.collaborators.length
      : 0,
    imageCount: item.items
      ? item.items.filter((i) => i.type === "image").length
      : 0,
  });

  // Get user stats
  const userStats = {
    total: scrapbooks?.length || 0,
    created: myScrapbooks.length,
    collaborating: collaboratingScrapbooks.length,
  };

  const logoutModalOpacity = useSharedValue(0);

  const logoutModalAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoutModalOpacity.value,
    };
  });

  const handleLogoutModalOpenClose = () => {
    setLogoutModalVisible(!logoutModalVisible);
    logoutModalOpacity.value = withTiming(!logoutModalVisible ? 1 : 0, {
      duration: 300,
    });
  };

  // Logout confirmation modal component
  const LogoutModal = () => {
    if (!logoutModalVisible) return null;

    return (
      <Animated.View style={[styles.modalOverlay, logoutModalAnimatedStyle]}>
        <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Error modal component
  const ErrorModal = () => {
    if (!errorModalVisible) return null;

    return (
      <View style={styles.modalOverlay}>
        <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.fullButton]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    const timeOut = setTimeout(() => {
      setStart(true);
    }, 500);
    return () => clearTimeout(timeOut);
  }, []);

  if (!start) {
    return (
      <View style={styles.loadingContainer}>
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
        <ActivityIndicator size="large" color="#5C6BC0" />
        <Text style={styles.loadingText}>Loading your dreamy creation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background elements */}
      <StatusBar style="light" translucent />
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
        end={{ x: 1, y: 1 }}
      />
      <CosmicEffect />

      {/* Header back button */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {hasScrolled && <BlurComponent blur={40} />}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <View style={styles.blurButton}>
              <Ionicons name="chevron-back-outline" size={30} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleLogoutModalOpenClose}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <View style={styles.blurButton}>
            <Ionicons name="log-out-outline" size={30} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Settings button */}

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      >
        {/* Profile header section */}
        <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
          <View style={styles.headerGradient}>
            {/* Avatar and username */}
            <Animated.View style={[styles.profileInfo, avatarAnimatedStyle]}>
              <TouchableOpacity
                onPress={pickAvatar}
                style={styles.avatarContainer}
              >
                <LinearGradient
                  colors={["#5C6BC0", "#5C6BC0", "#9575CD"]}
                  style={styles.avatarGradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {userData?.avatar ? (
                    <Image
                      source={{ uri: userData.avatar }}
                      style={styles.avatar}
                      contentFit="cover"
                      transition={300}
                      cachePolicy={"memory-disk"}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { zIndex: 100 }]}>
                      <MaterialCommunityIcons
                        name="face-man-outline"
                        size={AVATAR_SIZE * 0.5}
                        color="#5C6BC0"
                      />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {isEditingUsername ? (
                <View style={styles.usernameEditContainer}>
                  <BlurView
                    style={styles.usernameEditBlur}
                    intensity={40}
                    tint="dark"
                  >
                    <TextInput
                      style={styles.usernameInput}
                      value={editedUsername}
                      onChangeText={setEditedUsername}
                      selectionColor="#9575CD"
                      autoFocus
                      maxLength={20}
                      onBlur={() => setIsEditingUsername(false)}
                    />
                    <TouchableOpacity
                      onPress={saveUsername}
                      style={styles.saveButton}
                    >
                      <Ionicons name="checkmark" size={22} color="#5C6BC0" />
                    </TouchableOpacity>
                  </BlurView>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.usernameContainer}
                  onPress={() => setIsEditingUsername(true)}
                >
                  <Text style={styles.username}>
                    {userData?.username || "User"}
                  </Text>
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color="#5C6BC0"
                    style={styles.editIcon}
                  />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </Animated.View>

        {/* Stats cards */}
        <Animated.View style={[styles.statsSection, statsAnimatedStyle]}>
          <View style={styles.statCard}>
            <BlurView style={styles.statCardBlur} intensity={20} tint="dark">
              <LinearGradient
                colors={["#000000", "#050011", "#140044"]}
                style={styles.statCardGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Text style={styles.statValue}>{userStats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </LinearGradient>
            </BlurView>
          </View>

          <View style={styles.statCard}>
            <BlurView style={styles.statCardBlur} intensity={20} tint="dark">
              <LinearGradient
                colors={["#000000", "#050011", "#140044"]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Text style={styles.statValue}>{userStats.created}</Text>
                <Text style={styles.statLabel}>Created</Text>
              </LinearGradient>
            </BlurView>
          </View>

          <View style={styles.statCard}>
            <BlurView style={styles.statCardBlur} intensity={20} tint="dark">
              <LinearGradient
                colors={["#000000", "#050011", "#140044"]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <Text style={styles.statValue}>{userStats.collaborating}</Text>
                <Text style={styles.statLabel}>Shared</Text>
              </LinearGradient>
            </BlurView>
          </View>
        </Animated.View>
        {/* Content section */}
        <Animated.View style={[styles.contentSection, contentAnimatedStyle]}>
          {loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#5C6BC0" />
              <Text style={styles.loaderText}>Loading your scrapbooks...</Text>
            </View>
          ) : (
            <>
              {/* My Scrapbooks section */}
              {myScrapbooks.length > 0 && (
                <View style={styles.scrapbooksSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Scrapbooks</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>
                        {myScrapbooks.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scrapbooksGrid}>
                    {myScrapbooks.map((scrapbook) => (
                      <ScrapbookCard
                        key={scrapbook._id}
                        scrapbook={formatScrapbook(scrapbook)}
                        onPress={() =>
                          navigation.navigate("ScrapbookEditor", {
                            scrapbookId: scrapbook._id,
                            title: scrapbook.title,
                            isNew: false,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Collaborations section */}
              {collaboratingScrapbooks.length > 0 && (
                <View style={styles.scrapbooksSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Collaborations</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>
                        {collaboratingScrapbooks.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scrapbooksGrid}>
                    {collaboratingScrapbooks.map((scrapbook) => (
                      <ScrapbookCard
                        key={scrapbook._id}
                        scrapbook={formatScrapbook(scrapbook)}
                        onPress={() =>
                          navigation.navigate("ScrapbookEditor", {
                            scrapbookId: scrapbook._id,
                            title: scrapbook.title,
                            isNew: false,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {scrapbooks?.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIconContainer}>
                    <BlurView
                      style={styles.emptyStateIconBlur}
                      intensity={20}
                      tint="dark"
                    >
                      <Ionicons name="book-outline" size={40} color="#9575CD" />
                    </BlurView>
                  </View>
                  <Text style={styles.emptyStateTitle}>No Scrapbooks Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Create your first scrapbook and start collecting memories
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={handleCreateScrapbook}
                  >
                    <LinearGradient
                      colors={["#5C6BC0", "#9575CD"]}
                      style={styles.emptyStateButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.emptyStateButtonText}>
                        Create Scrapbook
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </Animated.View>
        {/*version and app updates */}
        <View style={{ height: 50 }} />
        <View>
          <Text style={styles.bottomText}>Version 2.0.0</Text>
          <Text style={styles.bottomText}>Made wid ❤️ by Kichu</Text>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {scrapbooks?.length > 0 && (
        <Animated.View
          style={[styles.fab, fabAnimatedStyle, { bottom: insets.bottom + 20 }]}
        >
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleCreateScrapbook}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#5C6BC0", "#9575CD"]}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Custom Modals */}
      <LogoutModal />
      <ErrorModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    zIndex: 100,
    ...Platform.select({
      ios: {
        height: 100,
        paddingBottom: 10,
      },
      android: {
        height: 80,
      },
    }),
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  // Header components
  backButton: {},
  settingsButton: {},
  blurButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Profile header section
  headerSection: {
    height: 250,
    width: "100%",
    position: "relative",
    marginBottom: 70,
    borderRadius: 0,
    //overflow: 'hidden',
  },
  headerGradient: {
    height: 250,
    width: "100%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileInfo: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  // Avatar styles
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradientBorder: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  avatarEditBlur: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Username and email styles
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
    fontFamily: "Allspice",
  },
  editIcon: {
    marginLeft: 8,
    marginBottom: 4,
  },
  usernameEditContainer: {
    marginBottom: 4,
  },
  usernameEditBlur: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  usernameInput: {
    fontSize: 18,
    color: "#FFFFFF",
    width: 150,
    textAlign: "center",
    fontFamily: "Allspice",
  },
  saveButton: {
    marginLeft: 8,
    padding: 4,
  },
  email: {
    fontSize: 14,
    color: "#9575CD",
    marginBottom: 8,
  },

  // Stats section styles
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    marginHorizontal: 4,
    overflow: "hidden",
  },
  statCardBlur: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statCardGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#5C6BC0",
  },

  // Create button
  createButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  // Content section styles
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loaderContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  loaderText: {
    color: "#5C6BC0",
    marginTop: 16,
    fontSize: 14,
  },

  // Scrapbooks section styles
  scrapbooksSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionBadge: {
    backgroundColor: "rgba(92, 107, 192, 0.2)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  sectionBadgeText: {
    color: "#5C6BC0",
    fontSize: 12,
    fontWeight: "600",
  },
  scrapbooksGrid: {
    width: "100%",
  },

  // Scrapbook card styles
  scrapbookCard: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#090909",
  },
  scrapbookCardInner: {
    width: "100%",
    height: "100%",
  },
  scrapbookCover: {
    width: "100%",
    height: "100%",
  },
  scrapbookOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  scrapbookTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  scrapbookMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrapbookMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  scrapbookMetaText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
  },

  // Empty state styles
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateIconContainer: {
    marginBottom: 20,
  },
  emptyStateIconBlur: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    fontFamily: "Allspice",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9575CD",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
    fontFamily: "Allspice",
  },
  emptyStateButton: {
    width: "70%",
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  emptyStateButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Allspice",
  },

  // Floating action button
  fab: {
    position: "absolute",
    right: 20,
    backgroundColor: "transparent",
    borderRadius: 30,
    shadowColor: "#5C6BC0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: "transparent",
  },
  modalContent: {
    backgroundColor: "#0F0015",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(92, 107, 192, 0.2)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#9575CD",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: "#5C6BC0",
  },
  fullButton: {
    backgroundColor: "#5C6BC0",
    width: "100%",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    color: "#5C6BC0",
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Allspice",
  },
  bottomText: {
    color: "#5C6BC0",
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Allspice",
  },
});

export default ProfileScreen;
