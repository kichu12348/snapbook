import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Linking,
  TouchableWithoutFeedback,
} from "react-native";
import { Entypo, Ionicons, Octicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { format, set } from "date-fns";
import { Image } from "expo-image";
import { useScrapbook } from "../context/ScrapbookContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../../utils/upload";
import axios from "axios";
import { saveToGallery } from "../../utils/downloadAndSave";
import * as MediaLibrary from "expo-media-library";
import { hi } from "date-fns/locale";

const { width: SCREEN_WIDTH, height } = Dimensions.get("window");
const width = SCREEN_WIDTH;

// Star background component
const StarySkyBackground = () => {
  const arrSize = 100;
  return (
    <View style={styles.starsContainer}>
      {Array.from({ length: arrSize }).map((_, index) => {
        const x = Math.random() * SCREEN_WIDTH;
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

const DownloadOverlay = ({ visible, downloadProgressAnimStyle, imageUri }) => {
  if (!visible) return null;
  return (
    <Animated.View style={styles.downloadOverlay}>
      <View style={styles.downloadContainer}>
        <Animated.View
          style={[styles.downloadProgressBar, downloadProgressAnimStyle]}
        />
      </View>
    </Animated.View>
  );
};

//
const ImageViewOverlay = ({ imageUri, onClose, animatedImage }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadProgress = useSharedValue(0);
  const downloadProgressAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${downloadProgress.value}%`,
    };
  });

  const handleDownload = async () => {
    if (!imageUri || isDownloading) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return;
    setIsDownloading(true);
    downloadProgress.value = 0;
    await saveToGallery(imageUri, (progress) => {
      downloadProgress.value = withTiming(progress, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    });

    setTimeout(() => {
      setIsDownloading(false);
      downloadProgress.value = 0;
    }, 400);
  };

  if (!imageUri) return null;
  return (
    <Animated.View style={[styles.imageViewOverlay, animatedImage]}>
      <BlurComponent blur={50} />
      <LinearGradient
        colors={["#000000", "transparent", "transparent", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <DownloadOverlay
        visible={isDownloading}
        downloadProgressAnimStyle={downloadProgressAnimStyle}
        imageUri={imageUri}
      />
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={styles.imageHeader}>
          <TouchableOpacity
            style={styles.overlayCloseButton}
            onPress={handleDownload}
          >
            <Octicons name="download" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.overlayCloseButton}>
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Image
          source={{ uri: imageUri }}
          style={styles.imageView}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={300}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Render image item with the collage layout styles
const RenderImageItem = React.memo(
  ({
    item,
    handleLongPress,
    clearLongPress,
    initiateRemoveItem,
    deleteButtonAnimatedStyle,
    longPressedItem,
    openViewer,
  }) => {
    const isLongPressed = item?._id === longPressedItem;

    return (
      <Pressable
        style={[
          styles.itemContainer,
          item.layoutStyle, // Apply dynamic layout style
          isLongPressed && styles.itemLongPressed,
        ]}
        onLongPress={() => handleLongPress(item?._id)}
        delayLongPress={300}
        onPress={() => {
          clearLongPress();
          if (!isLongPressed) openViewer(item.uri);
        }}
      >
        <Image
          source={{
            uri:
              item.uri ||
              "https://storage.googleapis.com/snapbook_bucket/temp-image.webp",
          }}
          style={styles.imageItem}
          cachePolicy={"memory-disk"}
          transition={1000}
        />
        {isLongPressed && (
          <Animated.View
            style={[styles.deleteButtonContainer, deleteButtonAnimatedStyle]}
          >
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => initiateRemoveItem(item?._id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
              <Ionicons name="trash" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Pressable>
    );
  }
);

// Render text item with the collage layout styles
const RenderTextItem = React.memo(
  ({
    item,
    handleLongPress,
    clearLongPress,
    initiateRemoveItem,
    deleteButtonAnimatedStyle,
    longPressedItem,
    openViewer,
  }) => {
    const isLongPressed = item?._id === longPressedItem;
    const textContent = React.useMemo(() => {
      return item.content.length > 50
        ? item.content.substring(0, 50) + "..."
        : item.content;
    }, []);

    return (
      <Pressable
        style={[
          styles.itemContainer,
          styles.textItemContainer,
          item.layoutStyle, // Apply dynamic layout style
          isLongPressed && styles.itemLongPressed,
        ]}
        onLongPress={() => handleLongPress(item?._id)}
        delayLongPress={300}
        onPress={() => {
          clearLongPress();
          if (!isLongPressed) openViewer(item);
        }}
      >
        <Text style={styles.textItem}>{textContent}</Text>
        {isLongPressed && (
          <Animated.View
            style={[styles.deleteButtonContainer, deleteButtonAnimatedStyle]}
          >
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => initiateRemoveItem(item?._id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
              <Ionicons name="trash" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Pressable>
    );
  }
);

// Timeline component
const TimelineItem = React.memo(
  ({ item, formatTimelineDate, getTimelineIcon }) => {
    const [imageErr, setImageError] = useState(false);
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineUserContainer}>
          {item.user?.avatar ? (
            <Image
              source={{ uri: item.user.avatar }}
              style={styles.timelineAvatar}
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person-circle-outline" size={24} color="#5C6BC0" />
          )}
        </View>

        <View style={styles.timelineContent}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineUser}>
              {item.user?.username || "Unknown User"}
            </Text>
            <Text style={styles.timelineAction}>
              {item.action} {item.itemType}
            </Text>
            <Text style={styles.timelineTimestamp}>
              {formatTimelineDate(item.timestamp)}
            </Text>
          </View>

          {item.details?.content &&
            (item.itemType === "text" || item.itemType === "title") && (
              <View style={styles.timelineDetail}>
                <Text style={styles.timelineDetailText}>
                  ❝{item.details.content}❞
                </Text>
              </View>
            )}

          {item.itemType === "image" && !imageErr && (
            <Image
              source={{
                uri:
                  item.details?.content ||
                  "https://storage.googleapis.com/snapbook_bucket/image-removed.png",
              }}
              style={styles.timelineThumbnail}
              contentFit="contain"
              width={100}
              height={100}
              cachePolicy="memory-disk"
              transition={300}
              alt="Dis is Image"
              onError={(e) => {
                if (e.error) setImageError(true);
              }}
            />
          )}
          {imageErr && (
            <Text style={styles.timelineErrorText}>
              Image not available or removed.
            </Text>
          )}
          {item.itemType === "collaborator" && (
            <View style={styles.timelineAddedCollaborator}>
              {item.details?.collaborator.avatar ? (
                <Image
                  source={{ uri: item.details?.collaborator.avatar }}
                  style={styles.timelineAvatar}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color="#5C6BC0"
                />
              )}
              <Text style={styles.timelineDetailText}>
                {item.details?.collaborator.username}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.timelineIconContainer}>
          <Ionicons
            name={getTimelineIcon(item.itemType, item.action)}
            size={20}
            color="#9575CD"
          />
        </View>
      </View>
    );
  }
);

// Active Users Component
const ActiveUsersComponent = ({ activeUsers, userData }) => {
  if (!activeUsers || activeUsers.length === 0) return null;
  return (
    <View style={styles.activeUsersContainer}>
      <Text style={styles.activeUsersTitle}>
        <Ionicons name="wifi" size={14} color="#FFCA80" /> Active Now
      </Text>
      <View style={styles.activeUsersList}>
        {activeUsers.map(
          (user, index) =>
            user.userId !== userData._id && (
              <View
                key={user.userId}
                style={[
                  styles.activeUserBadge,
                  index > 0 && { marginLeft: -8 },
                ]}
              >
                {user.avatar ? (
                  <Image
                    source={{
                      uri: user.avatar,
                    }}
                    style={styles.activeUserAvatar}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color="#5C6BC0"
                  />
                )}
              </View>
            )
        )}
      </View>
    </View>
  );
};

const CollaboratorsList = ({
  collaborators,
  currentScrapbook,
  userData,
  handleRemoveCollaborator,
}) => {
  if (!currentScrapbook || !collaborators || collaborators.length === 0)
    return null;

  return (
    <View style={styles.collaboratorsContainer}>
      <Text style={styles.collaboratorsTitle}>
        <Ionicons name="people" size={14} color="#FFCA80" /> Peeps
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collaboratorsScrollContent}
      >
        {collaborators.map((collab) => (
          <View key={collab?._id} style={styles.collaboratorItem}>
            {collab.avatar ? (
              <Image
                source={{ uri: collab.avatar }}
                style={styles.collaboratorAvatar}
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={24}
                color="#5C6BC0"
              />
            )}
            <Text style={styles.collaboratorName} numberOfLines={1}>
              {collab.username}
            </Text>
            {currentScrapbook &&
              userData &&
              currentScrapbook.owner?._id === userData?._id && (
                <TouchableOpacity
                  style={styles.removeCollaboratorButton}
                  onPress={() =>
                    handleRemoveCollaborator(collab?._id, collab.username)
                  }
                >
                  <Ionicons name="close-circle" size={16} color="#FF5252" />
                </TouchableOpacity>
              )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const CollaboratorOverlayComponent = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  searchError,
  handleSearchChange,
  handleSelectCollaborator,
  closeCollaboratorModal,
}) => {
  //if (!isAddingCollaborator) return null;

  const submitCollab = (user) => {
    handleSelectCollaborator(user);
    setSearchQuery("");
    setSearchResults([]);
    closeCollaboratorModal();
  };

  return (
    <View style={styles.collaboratorOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={[
            "#000000",
            "#000000",
            "#050011",
            "#0A0022",
            "#0F0033",
            "#140044",
          ]}
        />
        <View style={styles.collaboratorModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Collaborator</Text>
            <TouchableOpacity
              onPress={() => {
                closeCollaboratorModal();
                setSearchQuery("");
                setSearchResults([]);
              }}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#9575CD"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users by name or email..."
                placeholderTextColor="#9575CD"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            {searchError && (
              <Text style={styles.searchErrorText}>{searchError}</Text>
            )}

            {/* {!isSearching &&
              searchQuery.length > 0 &&
              searchResults.length === 0 && (
                <Text style={styles.noResultsText}>
                  {searchQuery.length < 2
                    ? "Type at least 2 characters to search"
                    : "No users found matching your search"}
                </Text>
              )} */}
          </View>

          <ScrollView
            style={styles.resultsContainer}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {searchResults.map((user) => (
              <TouchableOpacity
                key={user?._id}
                style={styles.userResultItem}
                onPress={() => submitCollab(user)}
              >
                <View style={styles.userAvatarContainer}>
                  {user.avatar ? (
                    <Image
                      source={{
                        uri: user.avatar,
                      }}
                      style={styles.userAvatar}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Ionicons
                      name="person-circle-outline"
                      size={35}
                      color="#5C6BC0"
                    />
                  )}
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userUsername}>{user.username}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>

                <Ionicons name="add-circle" size={24} color="#5C6BC0" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const BlurComponent = React.memo(({ blur = 20, style }) => {
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
        ...style,
      }}
      tint="dark"
    />
  );
});

function TextViewerOverlay({ item, close }) {
  if (!item) return null;
  return (
    <View style={styles.textItemViewerContainer}>
      <View style={styles.textItemViewerHeader}>
        <TouchableOpacity onPress={close} style={styles.closeButton}>
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.textItemViewerScroll}
        contentContainerStyle={styles.textItemViewerContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.textItemViewerTextContainer}>
          <Text style={styles.textItemViewerText}>{item.content}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const ScrapbookEditorScreen = ({ navigation, route }) => {
  // Get scrapbook ID from route params if editing existing scrapbook
  const { scrapbookId, isNew = false } = route.params || {};

  // Context hooks
  const { userData, userToken } = useAuth();
  const {
    currentScrapbook,
    timeline,
    collaborators,
    activeUsers,
    loading: contextLoading,
    fetchScrapbook,
    createScrapbook,
    updateTitle,
    addItem,
    removeItem,
    addCollaborator,
    removeCollaborator,
    clearCurrentScrapbook,
    socketRef,
  } = useScrapbook();

  // State for scrapbook data
  const [title, setTitle] = useState(route.params?.title || "New Scrapbook");
  const [isEditingTitle, setIsEditingTitle] = useState(isNew);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newText, setNewText] = useState("");
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [collaboratorUsername, setCollaboratorUsername] = useState("");
  const [start, setStart] = useState(false);
  const [confirmOverlay, setConfirmOverlay] = useState({
    visible: false,
    title: "",
    message: "",
    confirmAction: null,
    itemId: null,
  });
  const [notificationOverlay, setNotificationOverlay] = useState({
    visible: false,
    title: "",
    message: "",
    onDismiss: null,
  });
  const [permissionOverlay, setPermissionOverlay] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Animated values for toolbar
  const toolbarHeight = useSharedValue(0);
  const toolbarOpacity = useSharedValue(0);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const insets = useSafeAreaInsets();

  // New state to track the long-pressed item
  const [longPressedItem, setLongPressedItem] = useState(null);

  // Animation value for delete button
  const deleteButtonOpacity = useSharedValue(0);
  const animatedPaddingBottom = useSharedValue(100);

  // New state for timeline
  const [showTimeline, setShowTimeline] = useState(false);
  const timelineHeight = useSharedValue(0);
  const timelineOpacity = useSharedValue(0);
  const textViewerScale = useSharedValue(0);
  const textViewerOpacity = useSharedValue(0);

  // New states for collaborator search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [textViewerItem, setTextViewerItem] = useState(null);

  const animatedTextViewerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: textViewerScale.value }],
      opacity: textViewerOpacity.value,
    };
  });

  const hideHeaderLeftButton = () => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  };

  const showHeaderLeftButton = () => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={navigation.goBack}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back-outline" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  };

  const handleTextViewerOpen = (item) => {
    if(!item||imageUri) return;
    setTextViewerItem(item);
    hideHeaderLeftButton();
    textViewerScale.value = withTiming(1, { duration: 300 });
    textViewerOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleTextViewerClose = () => {
    textViewerScale.value = withTiming(0, { duration: 300 });
    textViewerOpacity.value = withTiming(0, { duration: 300 });
    showHeaderLeftButton();
    setTimeout(() => {
      setTextViewerItem(null);
    }, 300);
  };

  useEffect(() => {
    showHeaderLeftButton();
    if (socketRef.current) {
      socketRef.current.on("scrapbook-deleted", (data) => {
        if (data.scrapbookId === scrapbookId) {
          navigation.goBack();
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("scrapbook-deleted");
      }
    };
  }, []);

  const debouncedFetch = (func, delay = 300) => {
    let timeOutId;
    return (...args) => {
      if (timeOutId) clearTimeout(timeOutId);
      timeOutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Create debounced search function
  const Search = useCallback(
    async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await axios.get(`/api/users/search?query=${query}`, {
          headers: { "x-auth-token": userToken },
        });

        setSearchResults(response.data);
      } catch (error) {
        console.log("User search error:", error.message);
        setSearchError("Failed to search users. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, userToken]
  );

  const debouncedSearch = useMemo(() => debouncedFetch(Search, 300), []);

  const isOwner = React.useMemo(() => {
    return currentScrapbook?.owner?._id === userData?._id;
  }, [currentScrapbook]);

  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Handle collaborator selection
  const handleSelectCollaborator = async (user) => {
    try {
      // Check if the user is already a collaborator
      const isAlreadyCollaborator = collaborators.some(
        (collab) => collab?._id === user?._id
      );
      if (isAlreadyCollaborator) {
        setNotificationOverlay({
          visible: true,
          title: "Already a Collaborator",
          message: `${user.username} is already a collaborator.`,
          onDismiss: null,
        });
        setSearchQuery("");
        setSearchResults([]);
        setIsAddingCollaborator(false);
        closeCollaboratorModal();
        return;
      }
      const result = await addCollaborator(scrapbookId, user.username);

      if (result) {
        setNotificationOverlay({
          visible: true,
          title: "Collaborator Added",
          message: `${user.username} can now edit this scrapbook with you.`,
          onDismiss: null,
        });
      }

      // Clear search and close modal
      setSearchQuery("");
      setSearchResults([]);
      setIsAddingCollaborator(false);
    } catch (error) {
      console.error("Error adding collaborator:", error);
      Alert.alert(
        "Error",
        "Failed to add collaborator. " + (error.message || "Please try again.")
      );
    }
  };

  // Load scrapbook data from backend
  useEffect(() => {
    if (!isNew && scrapbookId) {
      setLoading(true);

      fetchScrapbook(scrapbookId)
        .then((scrapbook) => {
          if (scrapbook) {
            setTitle(scrapbook.title);

            // Convert backend items to local format
            const convertedItems =
              scrapbook.items?.map((item) => ({
                _id: item?._id,
                type: item.type,
                content: item.content,
                uri: item.type === "image" ? item.content : null,
                height: getRandomHeight(),
                createdBy: item.createdBy,
              })) || [];

            setItems(convertedItems);
          }
        })
        .catch((error) => {
          console.error("Error fetching scrapbook:", error);
          Alert.alert("Error", "Failed to load scrapbook. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // New scrapbook
      setLoading(false);
    }

    // Set header title
    navigation.setOptions({
      title: isNew ? "New Scrapbook" : route.params?.title || "Edit Scrapbook",
    });
  }, [scrapbookId, isNew]);

  // Update local title when currentScrapbook title changes (from socket events)
  useEffect(() => {
    if (currentScrapbook && !isEditingTitle) {
      setTitle(currentScrapbook.title);
    }
  }, [currentScrapbook?.title]);

  // Update items when they change from socket events
  useEffect(() => {
    if (currentScrapbook && currentScrapbook.items?.length > 0) {
      // Convert backend items to local format
      const convertedItems = currentScrapbook.items.map((item) => ({
        _id: item?._id,
        type: item.type,
        content: item.content,
        uri: item.type === "image" ? item.content : null,
        height: getRandomHeight(),
        createdBy: item.createdBy,
      }));

      setItems(convertedItems);
    }
  }, [currentScrapbook?.items]);

  // Animation styles for the toolbar
  const toolbarAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: toolbarHeight.value,
      opacity: toolbarOpacity.value,
    };
  });

  const animatedPaddingBottomStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: animatedPaddingBottom.value,
    };
  });

  const timelineAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: timelineHeight.value,
      opacity: timelineOpacity.value,
    };
  });

  const scrollViewRef = React.useRef(null);

  // Toggle the bottom toolbar
  const toggleToolbar = () => {
    if (toolbarOpen) {
      toolbarHeight.value = withTiming(0);
      toolbarOpacity.value = withTiming(0);
      animatedPaddingBottom.value = withTiming(100, { duration: 300 });
    } else {
      toolbarHeight.value = withTiming(120);
      toolbarOpacity.value = withTiming(1);
      animatedPaddingBottom.value = withTiming(200, { duration: 300 });
      //scrollToBottom(); // Scroll to bottom when toolbar opens
    }
    setToolbarOpen(!toolbarOpen);
  };

  // Toggle timeline view
  const toggleTimeline = () => {
    if (showTimeline) {
      timelineHeight.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      });
      timelineOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      });
      setShowTimeline(false);
    } else {
      setShowTimeline(true);
      timelineHeight.value = withTiming(height * 0.6, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      timelineOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("transitionStart", (e) => {
      if (e.data.closing) clearCurrentScrapbook(scrapbookId);
    });

    return unsubscribe;
  }, [navigation]);

  const MemoizedStarySkyBackground = useMemo(() => <StarySkyBackground />, []);

  // Helper for organizing items into collage layout groups
  const generateCollageLayout = (itemsList) => {
    if (!itemsList.length) return [];

    const layouts = [];
    let currentIndex = 0;

    while (currentIndex < itemsList.length) {
      // Randomly choose a layout pattern (1, 2, or 3 columns)
      const patternType = Math.floor(Math.random() * 5);
      let itemsInRow = [];

      switch (patternType) {
        case 0: // Full width single item
          if (currentIndex < itemsList.length) {
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: SCREEN_WIDTH - 32, // Full width with margin
                height: getRandomHeight(280, 350),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          }
          break;

        case 1: // Two items side by side
          if (currentIndex + 1 < itemsList.length) {
            // First item (left)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 40) / 2,
                height: getRandomHeight(180, 240),
                aspectRatio: undefined,
              },
            });
            currentIndex++;

            // Second item (right)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 40) / 2,
                height: getRandomHeight(180, 240),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          } else if (currentIndex < itemsList.length) {
            // Handle odd number of items
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: SCREEN_WIDTH - 32,
                height: getRandomHeight(280, 350),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          }
          break;

        case 2: // Three items in a row
          if (currentIndex + 2 < itemsList.length) {
            // First item
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 48) / 3,
                height: getRandomHeight(160, 200),
                aspectRatio: undefined,
              },
            });
            currentIndex++;

            // Second item
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 48) / 3,
                height: getRandomHeight(160, 200),
                aspectRatio: undefined,
              },
            });
            currentIndex++;

            // Third item
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 48) / 3,
                height: getRandomHeight(160, 200),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          } else {
            // Not enough items for three columns, use a different pattern
            if (currentIndex + 1 < itemsList.length) {
              // Two items
              itemsInRow.push({
                ...itemsList[currentIndex],
                layoutStyle: {
                  width: (SCREEN_WIDTH - 40) / 2,
                  height: getRandomHeight(180, 240),
                  aspectRatio: undefined,
                },
              });
              currentIndex++;

              itemsInRow.push({
                ...itemsList[currentIndex],
                layoutStyle: {
                  width: (SCREEN_WIDTH - 40) / 2,
                  height: getRandomHeight(180, 240),
                  aspectRatio: undefined,
                },
              });
              currentIndex++;
            } else {
              // Just one item left
              itemsInRow.push({
                ...itemsList[currentIndex],
                layoutStyle: {
                  width: SCREEN_WIDTH - 32,
                  height: getRandomHeight(280, 350),
                  aspectRatio: undefined,
                },
              });
              currentIndex++;
            }
          }
          break;

        case 3: // 1/3 + 2/3 split (left small, right big)
          if (currentIndex + 1 < itemsList.length) {
            // Small column (1/3)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 40) / 3,
                height: getRandomHeight(220, 280),
                aspectRatio: undefined,
              },
            });
            currentIndex++;

            // Large column (2/3)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (2 * (SCREEN_WIDTH - 40)) / 3,
                height: getRandomHeight(220, 280),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          } else {
            // Just one item left
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: SCREEN_WIDTH - 32,
                height: getRandomHeight(280, 350),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          }
          break;

        case 4: // 2/3 + 1/3 split (left big, right small)
          if (currentIndex + 1 < itemsList.length) {
            // Large column (2/3)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (2 * (SCREEN_WIDTH - 40)) / 3,
                height: getRandomHeight(220, 280),
                aspectRatio: undefined,
              },
            });
            currentIndex++;

            // Small column (1/3)
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: (SCREEN_WIDTH - 40) / 3,
                height: getRandomHeight(220, 280),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          } else {
            // Just one item left
            itemsInRow.push({
              ...itemsList[currentIndex],
              layoutStyle: {
                width: SCREEN_WIDTH - 32,
                height: getRandomHeight(280, 350),
                aspectRatio: undefined,
              },
            });
            currentIndex++;
          }
          break;
      }

      layouts.push({
        _id: `row-${layouts.length}`,
        items: itemsInRow,
      });
    }

    return layouts;
  };

  // Generate random height for masonry layout
  const getRandomHeight = (min = 180, max = 280) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Memoize the layout to prevent recalculation on every render
  const collageLayout = useMemo(() => generateCollageLayout(items), [items]);

  // Add image handler
  const addImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      setPermissionOverlay({
        visible: true,
        title: "Permission needed",
        message:
          "We need permission to access your photos to add images to your scrapbook.",
      });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const fileUri = result.assets[0].uri;
      const imageUri = await uploadImage(fileUri);
      if (!imageUri) {
        Alert.alert("Error", "Failed to upload image. Please try again.");
        return;
      }
      if (isNew) {
        // For new scrapbooks, store locally until saved
        const newItem = {
          _id: `temp-image-${Date.now()}`,
          type: "image",
          uri: imageUri,
          content: imageUri,
          height: getRandomHeight(),
        };
        setItems((prev) => [...prev, newItem]);
      } else {
        // For existing scrapbooks, send to server
        try {
          const newItem = {
            type: "image",
            content: imageUri,
            position: { x: 0, y: 0 },
          };

          const result = await addItem(scrapbookId, newItem);

          if (result) {
            // Add to local state (context will update currentScrapbook)
            const localItem = {
              _id: result?._id,
              type: "image",
              uri: imageUri,
              content: imageUri,
              height: getRandomHeight(),
              createdBy: userData?._id,
            };
            setItems((prev) => [...prev, localItem]);
          }
        } catch (error) {
          console.error("Error adding image:", error);
          Alert.alert("Error", "Failed to add image. Please try again.");
        }
      }

      // Close toolbar after adding
      if (toolbarOpen) toggleToolbar();
    }
  };

  // Handle text input
  const handleAddText = () => {
    setIsAddingText(true);
    if (toolbarOpen) toggleToolbar();
  };

  //handle image Viewer
  const imageViewOpacity = useSharedValue(0);
  const imageViewAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: imageViewOpacity.value,
      transform: [{ scale: imageViewOpacity.value }],
    };
  });
  const openViewer = (uri) => {
    if (!uri||textViewerItem) return;
    setIsImageViewerOpen(true);
    hideHeaderLeftButton();
    imageViewOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    setImageUri(uri);
  };

  const closeViewer = () => {
    showHeaderLeftButton();
    imageViewOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
    setTimeout(() => {
      setIsImageViewerOpen(false);
      setImageUri(null);
    }, 300);
  };

  // Handle text submission
  const submitNewText = async () => {
    if (newText.trim()) {
      if (isNew) {
        const newTextItem = {
          _id: `temp-text-${Date.now()}`,
          type: "text",
          content: newText.trim(),
          height: getRandomHeight(),
        };
        setItems((prev) => [...prev, newTextItem]);
      } else {
        // For existing scrapbooks, send to server
        try {
          const newTextItem = {
            type: "text",
            content: newText.trim(),
            position: { x: 0, y: 0 },
          };

          const result = await addItem(scrapbookId, newTextItem);

          if (result) {
            // Add to local state (context will update currentScrapbook)
            const localItem = {
              _id: result?._id,
              type: "text",
              content: newText.trim(),
              height: getRandomHeight(),
              createdBy: userData?._id,
            };
            setItems((prev) => [...prev, localItem]);
          }
        } catch (error) {
          console.error("Error adding text:", error);
          Alert.alert("Error", "Failed to add text. Please try again.");
        }
      }
      setNewText("");
    }
    setIsAddingText(false);
  };

  // Remove item handler
  const initiateRemoveItem = (id) => {
    setConfirmOverlay({
      visible: true,
      title: "Remove Item",
      message: "Are you sure you want to remove this item from your scrapbook?",
      confirmAction: async () => {
        if (isNew || id.toString().startsWith("temp-")) {
          // For new scrapbooks or temporary items, just update local state
          setItems((prev) => prev.filter((item) => item?._id !== id));
        } else {
          // For existing items, remove from server
          try {
            await removeItem(scrapbookId, id);
            // Update local state as well
            setItems((prev) => prev.filter((item) => item?._id !== id));
          } catch (error) {
            console.error("Error removing item:", error);
            Alert.alert("Error", "Failed to remove item. Please try again.");
          }
        }
        setConfirmOverlay((prev) => ({ ...prev, visible: false }));
      },
      itemId: id,
    });
  };

  // Handle long press on any item
  const handleLongPress = (itemId) => {
    setLongPressedItem(itemId);
    deleteButtonOpacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(100, withTiming(1, { duration: 300 }))
    );
  };

  // Clear long press state when clicking elsewhere
  const clearLongPress = () => {
    if (longPressedItem) {
      deleteButtonOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setLongPressedItem(null), 200);
    }
  };

  // Animated style for delete button
  const deleteButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteButtonOpacity.value,
      transform: [{ scale: deleteButtonOpacity.value }],
    };
  });

  //blur effect for the background

  // Render a row of the collage
  const renderCollageRow = (rowData) => {
    return (
      <View key={rowData?._id} style={styles.collageRow}>
        {rowData.items.map((item) => (
          <React.Fragment key={item?._id}>
            {item.type === "image" ? (
              <RenderImageItem
                item={item}
                handleLongPress={handleLongPress}
                clearLongPress={clearLongPress}
                initiateRemoveItem={initiateRemoveItem}
                deleteButtonAnimatedStyle={deleteButtonAnimatedStyle}
                longPressedItem={longPressedItem}
                openViewer={openViewer}
              />
            ) : (
              <RenderTextItem
                item={item}
                handleLongPress={handleLongPress}
                clearLongPress={clearLongPress}
                initiateRemoveItem={initiateRemoveItem}
                deleteButtonAnimatedStyle={deleteButtonAnimatedStyle}
                longPressedItem={longPressedItem}
                openViewer={handleTextViewerOpen}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Save scrapbook handler
  const saveScrapbook = async () => {
    if (isNew) {
      // Create new scrapbook
      try {
        const newScrapbook = await createScrapbook(title);

        if (newScrapbook && items.length > 0) {
          // Add all items to the new scrapbook
          for (const item of items) {
            await addItem(newScrapbook?._id, {
              type: item.type,
              content: item.type === "image" ? item.uri : item.content,
              position: { x: 0, y: 0 },
            });
          }
        }

        setNotificationOverlay({
          visible: true,
          title: "Scrapbook Created",
          message: "Your creative masterpiece has been saved successfully!",
          onDismiss: () => navigation.goBack(),
        });
      } catch (error) {
        console.error("Error creating scrapbook:", error);
        Alert.alert("Error", "Failed to save scrapbook. Please try again.");
      }
    } else {
      // Just update title if needed
      if (title !== currentScrapbook?.title) {
        try {
          await updateTitle(scrapbookId, title);
        } catch (error) {
          console.error("Error updating title:", error);
        }
      }

      setNotificationOverlay({
        visible: true,
        title: "Scrapbook Saved",
        message: "Your changes have been saved successfully!",
        onDismiss: () => navigation.goBack(),
      });
    }
  };

  // Format timestamp for display
  const formatTimelineDate = (date) => {
    const now = new Date();
    const diff = (now - date) / 1000 / 60; // diff in minutes

    if (diff < 1) return "Just now";
    if (diff < 60) return `${Math.floor(diff)} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    if (diff < 10080) return format(date, "EEE 'at' h:mm a"); // Within 7 days

    return format(date, "MMM d, yyyy");
  };

  // Get appropriate icon for timeline item
  const getTimelineIcon = (itemType, action) => {
    if (action === "added" && itemType === "collaborator")
      return "people-outline";
    if (action === "removed" && itemType !== "collaborator")
      return "trash-outline";

    switch (itemType) {
      case "image":
        return "image-outline";
      case "text":
        return "text-outline";
      case "title":
        return "create-outline";
      case "collaborator":
        return "people-outline";
      case "scrapbook":
        return "book-outline";
      default:
        return "document-outline";
    }
  };

  // Timeline Component (use real timeline data)

  // Handle title update
  const handleTitleUpdate = async () => {
    if (!isNew && scrapbookId && title !== currentScrapbook?.title) {
      try {
        await updateTitle(scrapbookId, title);
      } catch (error) {
        console.error("Error updating title:", error);
        // Revert to previous title
        setTitle(currentScrapbook?.title || "");
      }
    }
    setIsEditingTitle(false);
  };

  const collabModalTranlateY = useSharedValue(height);
  const collabModalOpacity = useSharedValue(0);

  const collabModalAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: collabModalOpacity.value,
      transform: [{ translateY: collabModalTranlateY.value }],
    };
  });

  // Add collaborator handler
  const handleAddCollaborator = () => {
    setIsAddingCollaborator(true);
    collabModalTranlateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    collabModalOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    toggleToolbar();
  };

  const closeCollaboratorModal = () => {
    Keyboard.dismiss();
    setCollaboratorUsername("");
    setIsAddingCollaborator(false);
    collabModalTranlateY.value = withTiming(height, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
    collabModalOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
  };

  // Submit collaborator handler
  const submitCollaborator = async () => {
    if (collaboratorUsername.trim() && !isNew && scrapbookId) {
      try {
        const result = await addCollaborator(
          scrapbookId,
          collaboratorUsername.trim()
        );

        if (result) {
          setNotificationOverlay({
            visible: true,
            title: "Collaborator Added",
            message: `${collaboratorUsername} can now edit this scrapbook with you.`,
            onDismiss: null,
          });
        }
      } catch (error) {
        console.error("Error adding collaborator:", error);
        Alert.alert(
          "Error",
          "Failed to add collaborator. " +
            (error.message || "Please try again.")
        );
      }
    }
  };

  // Remove collaborator handler
  const handleRemoveCollaborator = (collaboratorId, username) => {
    setConfirmOverlay({
      visible: true,
      title: "Remove Collaborator",
      message: `Are you sure you want to remove ❝${username}❞ from your scrapbook?`,
      confirmAction: async () => {
        try {
          await removeCollaborator(scrapbookId, collaboratorId);
        } catch (error) {
          console.error("Error removing collaborator:", error);
          Alert.alert(
            "Error",
            "Failed to remove collaborator. Please try again."
          );
        }
        setConfirmOverlay((prev) => ({ ...prev, visible: false }));
      },
      itemId: collaboratorId,
    });
  };

  // Permission Overlay component
  const PermissionOverlayComponent = () => {
    if (!permissionOverlay.visible) return null;

    return (
      <View style={styles.overlayContainer}>
        <BlurView intensity={20} style={styles.blurBackground} tint="dark" />
        <View style={styles.overlayCard}>
          <Text style={styles.overlayTitle}>{permissionOverlay.title}</Text>
          <Text style={styles.overlayMessage}>{permissionOverlay.message}</Text>
          <View style={styles.overlayButtonContainer}>
            <TouchableOpacity
              style={[styles.overlayButton, styles.overlayPrimaryButton]}
              onPress={() =>
                setPermissionOverlay((prev) => ({ ...prev, visible: false }))
              }
            >
              <Text style={styles.overlayButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Confirmation Overlay component
  const ConfirmOverlayComponent = () => {
    if (!confirmOverlay.visible) return null;

    return (
      <View style={styles.overlayContainer}>
        <BlurView intensity={20} style={styles.blurBackground} tint="dark" />
        <View style={styles.overlayCard}>
          <Text style={styles.overlayTitle}>{confirmOverlay.title}</Text>
          <Text style={styles.overlayMessage}>{confirmOverlay.message}</Text>
          <View style={styles.overlayButtonContainer}>
            <TouchableOpacity
              style={[styles.overlayButton, styles.overlayCancelButton]}
              onPress={() =>
                setConfirmOverlay((prev) => ({ ...prev, visible: false }))
              }
            >
              <Text style={styles.overlayButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overlayButton, styles.overlayDeleteButton]}
              onPress={confirmOverlay.confirmAction}
            >
              <Text style={styles.overlayButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Notification Overlay component
  const NotificationOverlayComponent = () => {
    if (!notificationOverlay.visible) return null;

    return (
      <View style={styles.overlayContainer}>
        <BlurView intensity={20} style={styles.blurBackground} tint="dark" />
        <View style={styles.overlayCard}>
          <Text style={styles.overlayTitle}>{notificationOverlay.title}</Text>
          <Text style={styles.overlayMessage}>
            {notificationOverlay.message}
          </Text>
          <View style={styles.overlayButtonContainer}>
            <TouchableOpacity
              style={[styles.overlayButton, styles.overlayPrimaryButton]}
              onPress={() => {
                setNotificationOverlay((prev) => ({ ...prev, visible: false }));
                if (notificationOverlay.onDismiss) {
                  notificationOverlay.onDismiss();
                }
              }}
            >
              <Text style={styles.overlayButtonText}>OK</Text>
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

  const cancelChangeTitle = () => {
    setTitle(currentScrapbook?.title || "");
    setIsEditingTitle(false);
  };

  if (!start) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[
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

      <Animated.View
        style={styles.container}
        onStartShouldSetResponder={() => {
          clearLongPress();
          return false;
        }}
      >
        {/* Title edit area */}
        <View style={styles.titleContainer}>
          {isEditingTitle ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                autoFocus
                maxLength={30}
                //onSubmitEditing={handleTitleUpdate}
                onBlur={cancelChangeTitle}
              />
              <TouchableOpacity
                onPress={handleTitleUpdate}
                style={styles.titleEditDoneButton}
              >
                <Ionicons name="checkmark" size={24} color="#FFCA80" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.titleTextContainer}
              onPress={() => setIsEditingTitle(true)}
            >
              <Text style={styles.titleText}>{title}</Text>
              <Ionicons name="pencil" size={16} color="#9575CD" />
            </TouchableOpacity>
          )}
          {/* Timeline toggle button */}
          <TouchableOpacity
            style={styles.timelineButton}
            onPress={toggleTimeline}
          >
            <Ionicons
              name="git-branch-outline"
              size={22}
              color={showTimeline ? "#FFCA80" : "#9575CD"}
            />
          </TouchableOpacity>
          {/* <LinearGradient
            colors={["#000000","rgba(0,0,0,0.8)", "transparent"]}
            style={{
              position: "absolute",
              top:20,
              left: 0,
              width: width,
              height: 100,
            }}
          /> */}
        </View>

        {/* Text input overlay */}
        {isAddingText && (
          <KeyboardAvoidingView
            style={styles.overlayContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          >
            <BlurView
              intensity={20}
              style={styles.blurBackground}
              tint="dark"
            />
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your text here..."
                placeholderTextColor="#9575CD"
                value={newText}
                onChangeText={setNewText}
                multiline
                autoFocus
              />
              <View style={styles.textInputButtons}>
                <TouchableOpacity
                  style={styles.textButton}
                  onPress={() => {
                    setIsAddingText(false);
                    setNewText("");
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: "red",
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.textButton,
                    styles.addButton,
                    newText.trim().length === 0 && { opacity: 0.5 },
                  ]}
                  onPress={submitNewText}
                  disabled={newText.trim().length === 0}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Timeline Overlay - use real timeline data */}

        <Animated.View
          style={[styles.timelineContainer, timelineAnimatedStyle]}
        >
          <BlurComponent blur={30} />
          <View style={[styles.timelineHeaderContainer]}>
            <Text style={styles.timelineTitle}>Timeline</Text>
            <TouchableOpacity
              style={styles.timelineCloseButton}
              onPress={toggleTimeline}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.timelineList}
            contentContainerStyle={styles.timelineContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {timeline && timeline.length > 0 ? (
              timeline.map((item) => (
                <TimelineItem
                  key={item?._id}
                  item={item}
                  formatTimelineDate={formatTimelineDate}
                  getTimelineIcon={getTimelineIcon}
                  handleLongPress={handleLongPress}
                  clearLongPress={clearLongPress}
                />
              ))
            ) : (
              <Text style={styles.emptyTimelineText}>No activity yet</Text>
            )}
          </ScrollView>
        </Animated.View>

        {/* Main content - Collaborators, Active Users, and Scrapbook Items */}
        <Animated.ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={clearLongPress}
          ref={scrollViewRef}
        >
          {/* Show collaborators list for existing scrapbooks */}
          {!isNew && (
            <CollaboratorsList
              collaborators={collaborators}
              currentScrapbook={currentScrapbook}
              handleRemoveCollaborator={handleRemoveCollaborator}
              userData={userData}
            />
          )}

          {/* Show active users when others are viewing */}
          {!isNew && (
            <ActiveUsersComponent
              activeUsers={activeUsers}
              userData={userData}
            />
          )}

          <Animated.View
            style={[styles.masonryContent, animatedPaddingBottomStyle]}
          >
            {collageLayout.length > 0 ? (
              collageLayout.map((row) => renderCollageRow(row))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Your scrapbook is empty.</Text>
                <Text style={styles.emptySubText}>
                  Add images and text to create your masterpiece.
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.ScrollView>

        {/* Bottom toolbar with collaborator button for existing scrapbooks */}
        <View
          style={[styles.toolbarContainer, { paddingBottom: insets.bottom }]}
        >
          <BlurComponent />

          <TouchableOpacity
            style={styles.toolbarToggle}
            onPress={toggleToolbar}
          >
            <Ionicons
              name={toolbarOpen ? "chevron-down" : "add"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Animated.View style={[styles.toolbarContent, toolbarAnimatedStyle]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolbarScrollContent}
              style={styles.toolbarScrollView}
            >
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={addImageFromGallery}
              >
                <Ionicons name="image" size={28} color="#FFFFFF" />
                <Text style={styles.toolbarButtonText}>Add Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={handleAddText}
              >
                <Ionicons name="text" size={28} color="#FFFFFF" />
                <Text style={styles.toolbarButtonText}>Add Text</Text>
              </TouchableOpacity>

              {!isNew && (
                <TouchableOpacity
                  style={[styles.toolbarButton, !isOwner && { opacity: 0.5 }]}
                  onPress={handleAddCollaborator}
                  disabled={isAddingCollaborator || !isOwner}
                >
                  <Ionicons name="people" size={28} color="#FFFFFF" />
                  <Text style={styles.toolbarButtonText}>Add Collaborator</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={saveScrapbook}
              >
                <Ionicons name="save" size={28} color="#FFCA80" />
                <Text style={[styles.toolbarButtonText, { color: "#FFCA80" }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>

        {/* Custom overlay components */}
        <PermissionOverlayComponent />
        <ConfirmOverlayComponent />
        <NotificationOverlayComponent />
      </Animated.View>
      <Animated.View
        style={[styles.collaboratorOverlay, collabModalAnimatedStyle]}
      >
        <CollaboratorOverlayComponent
          isAddingCollaborator={isAddingCollaborator}
          setIsAddingCollaborator={setIsAddingCollaborator}
          closeCollaboratorModal={closeCollaboratorModal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          isSearching={isSearching}
          searchError={searchError}
          handleSearchChange={handleSearchChange}
          handleSelectCollaborator={handleSelectCollaborator}
          handleCollaboratorSubmit={submitCollaborator}
        />
      </Animated.View>
      <ImageViewOverlay
        imageUri={imageUri}
        onClose={closeViewer}
        animatedImage={imageViewAnimatedStyle}
      />
      <Animated.View
        style={[styles.textViewerOverlay, animatedTextViewerStyle]}
      >
        <BlurComponent blur={50} />
        <LinearGradient
          colors={["#000000", "transparent", "transparent", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <TextViewerOverlay
          item={textViewerItem}
          close={handleTextViewerClose}
        />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Allspice",
  },
  titleContainer: {
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  titleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    zIndex: 10,
  },
  titleText: {
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 8,
    fontFamily: "Allspice",
  },
  titleEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  titleInput: {
    flex: 1,
    fontSize: 18,
    color: "#FFFFFF",
    paddingBottom: 4,
    fontFamily: "Allspice",
  },
  titleEditDoneButton: {
    marginLeft: 10,
    padding: 4,
  },
  timelineButton: {
    padding: 8,
    marginLeft: 10,
    zIndex: 10,
  },
  masonryRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  masonryContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    overflow: "hidden",
    borderRadius: 16,
    margin: 4,
  },
  imageItem: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  textItemContainer: {
    backgroundColor: "rgba(42, 30, 92, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  textItem: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Allspice",
    paddingHorizontal: 2,
  },
  removeButton: {
    display: "none", // Hide the old remove button
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptySubText: {
    color: "#9575CD",
    fontSize: 14,
    textAlign: "center",
  },
  textInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 20,
  },
  textInputContainer: {
    backgroundColor: "#1A1035",
    width: "100%",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textInput: {
    backgroundColor: "rgba(42, 30, 92, 0.5)",
    color: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    paddingVertical: 8,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
    fontSize: 16,
    fontFamily: "Allspice",
  },
  textInputButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#5C6BC0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  toolbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    overflow: "hidden",
    zIndex: 10,
  },
  toolbarToggle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  toolbarContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    position: "relative",
  },
  toolbarButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  toolbarButtonText: {
    color: "#FFFFFF",
    marginTop: 4,
    fontSize: 12,
  },
  itemLongPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
    shadowColor: "#FFCA80",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  deleteButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    //paddingBottom: 200,
  },
  collageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 20,
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayCard: {
    backgroundColor: "#1A1035",
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  overlayMessage: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  overlayButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  overlayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  overlayCancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  overlayDeleteButton: {
    backgroundColor: "rgba(255, 82, 82, 0.8)",
  },
  overlayPrimaryButton: {
    backgroundColor: "#5C6BC0",
  },
  overlayButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  // Timeline styles
  timelineContainer: {
    position: "absolute",
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: "rgba(26, 16, 53, 0.5)",
    borderRadius: 16,
    zIndex: 50,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    padding: 10,
  },

  timelineHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  timelineTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  timelineCloseButton: {
    padding: 4,
  },

  timelineList: {
    flex: 1,
  },

  timelineContentContainer: {
    paddingVertical: 10,
  },

  timelineItem: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },

  timelineUserContainer: {
    marginRight: 12,
  },

  timelineAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#2A1E5C",
  },

  timelineAddedCollaborator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 8,
    backgroundColor: "rgba(42, 30, 92, 0.5)",
    padding: 8,
    borderRadius: 8,
  },

  timelineContent: {
    flex: 1,
  },

  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },

  timelineUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFCA80",
    marginRight: 6,
  },

  timelineAction: {
    fontSize: 14,
    color: "#FFFFFF",
    marginRight: 6,
  },

  timelineTimestamp: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },

  timelineDetail: {
    backgroundColor: "rgba(42, 30, 92, 0.5)",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },

  timelineDetailText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontStyle: "italic",
  },

  timelineThumbnail: {
    height: 80,
    borderRadius: 8,
    marginTop: 6,
  },

  timelineIconContainer: {
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineErrorText: {
    color: "#FF5252",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
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
  collaboratorsContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  collaboratorsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    fontFamily: "Allspice",
  },
  collaboratorsScrollContent: {
    paddingVertical: 4,
    paddingLeft: 2,
    paddingRight: 12,
  },
  collaboratorItem: {
    backgroundColor: "rgba(42, 30, 92, 0.6)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    gap: 4,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(92, 107, 192, 0.3)",
  },
  collaboratorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#5C6BC0",
  },
  collaboratorName: {
    color: "#FFFFFF",
    fontSize: 12,
    maxWidth: 100,
    fontFamily: "Allspice",
  },
  removeCollaboratorButton: {
    marginLeft: 6,
    padding: 2,
  },

  activeUsersContainer: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  activeUsersTitle: {
    fontSize: 14,
    color: "#FFCA80",
    fontWeight: "500",
  },
  activeUsersList: {
    flexDirection: "row",
  },
  activeUserBadge: {
    position: "relative",
  },
  activeUserAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#140044",
  },
  emptyTimelineText: {
    textAlign: "center",
    color: "#9575CD",
    padding: 20,
    fontStyle: "italic",
  },
  // New styles for the enhanced collaborator modal
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  collaboratorModal: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 30, 92, 0.5)",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(92, 107, 192, 0.3)",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: "#FFFFFF",
    fontSize: 16,
  },
  clearButton: {
    padding: 6,
  },
  searchSpinner: {
    marginTop: 16,
    alignSelf: "center",
  },
  searchErrorText: {
    color: "#FF5252",
    marginTop: 12,
    textAlign: "center",
  },
  noResultsText: {
    color: "#9575CD",
    marginTop: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  resultsContainer: {
    flex: 1,
    marginTop: 10,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  userAvatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#2A1E5C",
  },
  userInfo: {
    flex: 1,
  },
  userUsername: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#9575CD",
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  modalFooterText: {
    fontSize: 14,
    color: "#9575CD",
    textAlign: "center",
  },
  collaboratorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 200,
    ...StyleSheet.absoluteFillObject,
  },
  imageViewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 200,
    ...StyleSheet.absoluteFillObject,
  },
  imageView: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    resizeMode: "contain",
  },
  imageHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 30,
  },
  overlayCloseButton: {
    alignSelf: "flex-end",
  },
  downloadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
    gap: 20,
    ...StyleSheet.absoluteFillObject,
  },
  downloadContainer: {
    borderRadius: 16,
    height: 5,
    width: "80%",
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "rgba(42, 30, 92, 0.5)",
    overflow: "hidden",
    position: "relative",
  },
  downloadProgressBar: {
    height: 5,
    backgroundColor: "#ffffff",
    borderRadius: 5,
  },
  downloadImage: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  textItemViewerContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  textItemViewerScroll: {
    flex: 1,
  },
  textItemViewerContentContainer: {
    paddingVertical: 16,
    paddingBottom: 100,
  },
  textItemViewerText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Allspice",
    paddingHorizontal: 2,
  },
  textItemViewerTextContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    minHeight: height * 0.6,
    width,
    padding: 16,
  },
  textItemViewerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textViewerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 200,
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
    height: 50,
  },
});

export default ScrapbookEditorScreen;
