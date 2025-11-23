import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Asset Library
      </Text>
      <Text style={styles.subtitle}>
        Asset management and library will be implemented here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0A0A0A",
  },
  title: {
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});


