import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../../src/hooks/_useAuth";

const API_URL = "https://owais-js-wtoy.vercel.app";; // Your actual computer IP

const StylishInputs = () => {
  const { getToken, signOut, user, isLoaded, isSignedIn } = useAuth();

  // Authentication state
  const [authChecked, setAuthChecked] = useState(false);

  // Form states
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [detailImages, setDetailImages] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);

  // Check authentication on mount
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        console.log("User not authenticated, redirecting to login...");

        router.replace("/");
        return;
      }
      console.log("✅ User authenticated:", user?.email);
      setAuthChecked(true);
    }
  }, [isLoaded, isSignedIn, user?.email]);

  //second detail image picker function
  const pickDetailImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Gallery access is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const validImages = result.assets.filter((asset) => asset.base64);
      if (validImages.length === 0) {
        Alert.alert("Error", "No valid images selected.");
        return;
      }
      setDetailImages((prev) => [
        ...prev,
        ...validImages.filter(
          (newImg) => !prev.some((img) => img.uri === newImg.uri),
        ),
      ]);
    }
  }, []);

  const toggleSize = useCallback((size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }, []);

  // ✅ Pick image
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Gallery access is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, // Reduce quality to make upload faster and smaller
      base64: true, // Get base64 data
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log("📷 Image picked:", {
        uri: asset.uri,
        hasBase64: !!asset.base64,
        base64Length: asset.base64?.length || 0,
      });

      if (!asset.base64) {
        Alert.alert("Error", "Failed to read image data. Please try again.");
        return;
      }

      setImage(asset);
    }
  }, []);

  // ✅ Fetch items - API call with authentication token
  const fetchItems = useCallback(async () => {
    try {
      console.log("🔍 Fetching items with authentication...");
      console.log("📧 User:", user?.email);
      console.log("🔑 Auth state:", { isSignedIn, isLoaded });

      // Get authentication token
      const token = await getToken();
      if (!token) {
        console.error("❌ No authentication token available");
        Alert.alert(
          "Authentication Error",
          "Failed to get authentication token. Please sign in again.",
        );
        setLoading(false);
        return;
      }

      console.log(
        "✅ Token retrieved successfully:",
        token.substring(0, 30) + "...",
      );
      console.log("📡 Making API request to:", `${API_URL}/api/items`);

      const res = await axios.get(`${API_URL}/api/items`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      console.log("✅ API Response received:", res.status);
      console.log("📊 Response data:", res.data);

      // Handle different response structures
      const itemsData = Array.isArray(res.data)
        ? res.data
        : res.data.items || res.data.data || [];

      console.log("📦 Items data:", itemsData.length, "items");
      setItems(itemsData);
    } catch (err) {
      console.error("❌ Error fetching items:", err);
      console.error("❌ Error response:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);

      // Handle specific auth errors
      if (err.response?.status === 401) {
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please sign in again.",
        );
        router.replace("/");
        return;
      }

      Alert.alert(
        "Error",
        `Failed to fetch items: ${err.response?.data?.error?.message || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, user, isSignedIn, isLoaded]);

  useEffect(() => {
    // Only fetch items when authentication is confirmed
    if (authChecked && isSignedIn) {
      fetchItems();
    }
  }, [authChecked, isSignedIn]); // Remove fetchItems from dependencies to prevent infinite loop

  // ✅ Add item
  const addItem = useCallback(async () => {
    if (
      !price ||
      !category ||
      !itemName ||
      !image ||
      detailImages.length === 0
    ) {
      Alert.alert("Error", "Please fill all fields and choose image!");
      return;
    }

    try {
      // Direct API call without token
      if (!image.base64) {
        Alert.alert(
          "Error",
          "Image data is missing. Please select a image again.",
        );
        return;
      }

      console.log("📤 Preparing upload:", {
        Name: itemName,
        price: price,
        category: category,
        hasBase64: !!image.base64,
        base64Length: image.base64.length,
        imageBase64: `data:image/jpeg;base64,${image.base64}`, // cover image
        detailImagesBase64: (detailImages || []).map(
          (img) => `data:image/jpeg;base64,${img.base64}`,
        ), // array
        sizes: selectedSizes,
      });

      // Send as JSON with base64 image
      const payload = {
        Name: itemName,
        price: price.toString(),
        description: description,
        category: category,
        imageBase64: `data:image/jpeg;base64,${image.base64}`,
        detailImagesBase64: (detailImages || []).map(
          (img) => `data:image/jpeg;base64,${img.base64}`,
        ), // array
        sizes: selectedSizes,
      };

      console.log("📤 Uploading to:", `${API_URL}/api/items`);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        console.error("No authentication token available for adding item");
        Alert.alert("Error", "Authentication required. Please sign in again.");
        return;
      }

      const response = await axios.post(`${API_URL}/api/items`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      });

      console.log("Item added successfully:", response.data);

      fetchItems();
      Alert.alert("Success", "Item added successfully!");
      setPrice("");
      setCategory("");
      setItemName("");
      setImage(null);
      setDescription("");
      setDetailImages([]);
      setSelectedSizes([]);
    } catch (err) {
      console.log("❌ Add item error:", err);
      console.log("❌ Error message:", err.message);

      Alert.alert("Error", err.message || "Failed to add item");
    }
  }, [
    price,
    category,
    itemName,
    image,
    detailImages,
    description,
    selectedSizes,
    getToken,
    fetchItems,
  ]);

  // ✅ Delete item
  const deleteItem = useCallback(
    async (id) => {
      try {
        console.log("🗑️ Deleting item:", id);

        // Get authentication token
        const token = await getToken();
        if (!token) {
          console.error("No authentication token available for deleting item");
          Alert.alert(
            "Error",
            "Authentication required. Please sign in again.",
          );
          return;
        }

        const response = await axios.delete(`${API_URL}/api/items/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("✅ Delete response:", response.data);

        // Remove item from state immediately
        setItems((prev) => {
          const filtered = prev.filter(
            (item) => item.id !== id && item._id !== id,
          );
          console.log("📋 Items after delete:", filtered.length);
          return filtered;
        });

        Alert.alert("Success", "Item deleted successfully");
      } catch (err) {
        console.log("❌ Delete error:", err);

        Alert.alert("Error", "Failed to delete item");
      }
    },
    [getToken],
  );

  // ✅ Sign Out function
  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      // Use custom hook signOut which handles Clerk sign out
      await signOut();
      router.replace("/");
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      // Always navigate even if sign out fails
      router.replace("/");
    }
  }, [signOut]);

  // Don't render until auth is checked
  if (!authChecked || !isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Checking authentication...
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { flex: 1, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Loading admin panel...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with Sign Out Button */}
        <View style={styles.headerContainer}>
          <Text style={styles.heading}>Admin Panel</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeading}>Add New Item</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Enter price"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter category"
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={itemName}
            onChangeText={setItemName}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={{ fontWeight: "600" }}>Select Sizes</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            {["Small", "Medium", "Large"].map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => toggleSize(size)}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: selectedSizes.includes(size)
                    ? "#FFA500"
                    : "#ddd",
                  backgroundColor: selectedSizes.includes(size)
                    ? "#FFF4E1"
                    : "#fff",
                }}
              >
                <Text>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              paddingTop: 10,
              paddingBottom: 10,
              justifyContent: "center",
              paddingTop: 20,
            }}
          >
            <TouchableOpacity style={{ height: 40 }} onPress={pickDetailImages}>
              <Text
                style={{
                  backgroundColor: "#007BFF",
                  width: "60%",
                  padding: 12,
                  color: "white",
                  borderRadius: 10,
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                Choose Detail Images
              </Text>
            </TouchableOpacity>
          </View>
          <View>
            {detailImages.length > 0 && (
              <ScrollView horizontal style={{ marginTop: 10 }}>
                {detailImages.map((img, idx) => (
                  <View
                    key={idx}
                    style={{ marginRight: 10, position: "relative" }}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        marginTop: 15,
                      }}
                    />
                    {/* X button sirf is image ke liye */}
                    <TouchableOpacity
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        backgroundColor: "red",
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={() => {
                        setDetailImages((prev) =>
                          prev.filter((_, i) => i !== idx),
                        );
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        X
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btnPrimary} onPress={pickImage}>
              <Text style={styles.btnText}>Choose Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSuccess} onPress={addItem}>
              <Text style={styles.btnText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {image && (
            <View style={styles.previewBox}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            </View>
          )}
        </View>

        <Text style={styles.listHeading}>Items List</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) => (
            <View style={styles.itemBox}>
              <Image
                source={{ uri: item.imageUrl || item.image_url }}
                style={styles.itemImage}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.itemText}>{item.name || item.Name}</Text>
                <Text style={styles.subText}>Category: {item.category}</Text>
                <Text style={styles.subText}>Price: Rs {item.price}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteItem(item.id || item._id)}
              >
                <Text style={{ color: "#fff" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f9f9f9" },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#333" },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  signOutBtn: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signOutBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingTop: 20,
  },
  btnPrimary: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 10,
    flex: 0.48,
    alignItems: "center",
  },
  btnSuccess: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 10,
    flex: 0.48,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  previewBox: { marginTop: 15 },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    resizeMode: "cover",
  },
  listHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#444",
  },
  itemBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  itemImage: { width: 65, height: 65, borderRadius: 8 },
  itemText: { fontSize: 16, fontWeight: "600", color: "#333" },
  subText: { color: "#555" },
  deleteBtn: {
    backgroundColor: "red",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});

export default StylishInputs;
