import { Image, StyleSheet, Text, View } from "react-native";
import { brandColors } from "../theme/brand";

type AfrinexelBrandProps = {
  caption?: string;
  compact?: boolean;
};

export function AfrinexelBrand({ caption = "Parent Portal", compact = false }: AfrinexelBrandProps) {
  return (
    <View style={[styles.container, compact ? styles.compactContainer : styles.centerContainer]}>
      <View style={[styles.logoFrame, compact ? styles.compactLogoFrame : null]}>
        <Image
          source={require("../../assets/images/afrinexel.png")}
          style={[styles.logo, compact ? styles.compactLogo : null]}
          resizeMode="contain"
        />
      </View>
      <View style={[styles.copy, compact ? styles.compactCopy : null]}>
        <Text style={[styles.name, compact ? styles.compactName : null]}>Afrinexel</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  centerContainer: {
    alignItems: "center",
    gap: 10,
  },
  compactContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  logoFrame: {
    alignItems: "center",
    backgroundColor: brandColors.primarySoft,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  compactLogoFrame: {
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logo: {
    height: 42,
    width: 150,
  },
  compactLogo: {
    height: 30,
    width: 112,
  },
  copy: {
    alignItems: "center",
    gap: 2,
  },
  compactCopy: {
    alignItems: "flex-start",
  },
  name: {
    color: brandColors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  compactName: {
    fontSize: 20,
  },
  caption: {
    color: brandColors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
