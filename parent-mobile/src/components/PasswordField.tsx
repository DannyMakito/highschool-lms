import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { ComponentProps } from "react";
import { brandColors } from "../theme/brand";

type PasswordFieldProps = ComponentProps<typeof TextInput> & {
  containerStyle?: ComponentProps<typeof View>["style"];
};

export function PasswordField({ containerStyle, style, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, style]}
      />
      <Pressable
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={brandColors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
  },
  toggle: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
});
