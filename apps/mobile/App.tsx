import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { appName } from "@casita/shared";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{appName}</Text>
      <Text style={styles.title}>Gastos compartidos, incluso sin conexion.</Text>
      <Text style={styles.body}>La app movil esta preparada para recibir SQLite, sync offline y autenticacion.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f7f5ef"
  },
  eyebrow: {
    color: "#52796f",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12
  },
  title: {
    color: "#1f2933",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 38,
    marginBottom: 16
  },
  body: {
    color: "#52606d",
    fontSize: 17,
    lineHeight: 26
  }
});
