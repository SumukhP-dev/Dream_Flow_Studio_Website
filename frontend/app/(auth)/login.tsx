import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      // Check if user has completed onboarding
      const onboardingCompleted = await AsyncStorage.getItem('@dreamflow:onboarding_completed');
      if (onboardingCompleted === 'true') {
        router.replace("/(tabs)/generator");
      } else {
        router.replace("/(onboarding)");
      }
    } catch (error) {
      console.error("Login failed:", error);
      // TODO: Show error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        Dream Flow Studio
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  title: {
    marginBottom: 32,
    textAlign: "center",
    color: "#FFFFFF",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});


