import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { appName } from "@casita/shared";
import { ApiClient } from "@casita/api-client";

type HealthResponse = {
  status: string;
  service?: string;
  timestamp?: string;
};

export default function App() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:3000";
  const apiClient = useMemo(() => new ApiClient({ baseUrl }), [baseUrl]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("Sin comprobar");

  const handleHealthCheck = async () => {
    setLoading(true);
    setResult("Comprobando...");

    try {
      const health = await apiClient.get<HealthResponse>("/api/health");
      setResult(`OK: ${health.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setResult(`ERROR: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{appName}</Text>
      <Text style={styles.title}>Gastos compartidos, incluso sin conexion.</Text>
      <Text style={styles.body}>La app movil esta preparada para recibir SQLite, sync offline y autenticacion.</Text>
      <Text style={styles.meta}>API: {baseUrl}</Text>
      <Pressable style={styles.button} onPress={handleHealthCheck} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Probar API /api/health</Text>}
      </Pressable>
      <Text style={styles.result}>{result}</Text>
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
    lineHeight: 26,
    marginBottom: 24
  },
  meta: {
    color: "#334e68",
    fontSize: 13,
    marginBottom: 12
  },
  button: {
    backgroundColor: "#52796f",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  result: {
    marginTop: 14,
    color: "#1f2933",
    fontSize: 15,
    fontWeight: "600"
  }
});
