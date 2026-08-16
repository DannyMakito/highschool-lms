import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { loading, session, parent, logout } = useAuth();
  const [timeoutExpired, setTimeoutExpired] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimeoutExpired(false);
      return undefined;
    }

    const timeout = setTimeout(() => setTimeoutExpired(true), 6000);
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (!loading && session && !parent) {
      void logout();
    }
  }, [loading, session, parent, logout]);

  if (loading) {
    if (timeoutExpired) {
      return <Redirect href="/login" />;
    }

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return <Redirect href={session && parent ? "/home" : "/login"} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
});
