import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Updates from "expo-updates";
import { enableScreens } from "react-native-screens";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

enableScreens(false);

// Import screens
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ScrapbookEditorScreen from "./src/screens/ScrapbookEditorScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

// Import Auth and Scrapbook Context
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ScrapbookProvider } from "./src/context/ScrapbookContext";

// Create navigation stack
const Stack = createStackNavigator();

// Dark dreamy theme
const DreamyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#000000", // Black
    background: "#0A0F24", // Deep Navy
    card: "#2A1E5C", // Soft Purple
    text: "#FFFFFF",
    border: "#121212", // Misty Black
    notification: "#9575CD", // Muted Lavender
    accent: "#FFCA80", // Soft Gold
  },
};

function MainNavigator() {
  const { isLoading, userToken } = useAuth();

  if (isLoading) {
    // Loading screen
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={DreamyTheme.colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DreamyTheme}>
      <StatusBar style="light" backgroundColor={"#000"} translucent />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: DreamyTheme.colors.primary,
          },
          headerTintColor: DreamyTheme.colors.text,
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 20,
          },
          cardStyle: { backgroundColor: DreamyTheme.colors.background },
        }}
      >
        {!userToken ? (
          // Auth flow
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        ) : (
          // Main app flow
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: null,
                detachPreviousScreen: false,
              }}
            />
            <Stack.Screen
              name="ScrapbookEditor"
              component={ScrapbookEditorScreen}
              options={() => {
                return {
                  title: "",
                  headerBackTitle: null,
                  detachPreviousScreen: false,
                  headerTitle: "",
                };
              }}
            />
            <Stack.Screen
              name="ProfileScreen"
              component={ProfileScreen}
              options={{ headerShown: false, detachPreviousScreen: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function App() {
  React.useLayoutEffect(() => {
    // Check for updates
    async function checkForUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log("Update error:", error.message);
      }
    }

    checkForUpdates();
  }, []);

  const [loaded, err] = useFonts({
    AllSpice: require("./assets/fonts/allspice.ttf")
  });

  React.useEffect(() => {
    if (loaded || err) SplashScreen.hideAsync();
  }, [loaded, err]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ScrapbookProvider>
            <MainNavigator />
          </ScrapbookProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
