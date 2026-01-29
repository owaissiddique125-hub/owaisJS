import messaging from "@react-native-firebase/messaging";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../server/supabase/supbase";
import useAuth from "../../src/hooks/_useAuth";

const API_URL = "https://owais-js-wtoy.vercel.app";

const StylishInputs = () => {
  const { getToken, signOut, isLoaded, isSignedIn } = useAuth();
  const scrollViewRef = useRef(null);

  // --- States ---
  const [authChecked, setAuthChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [detailImages, setDetailImages] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const updateAdminToken = async () => {
    try {
      // Permission maangein (Android 13+ ke liye zaroori hai)
      await messaging().requestPermission();

      const token = await messaging().getToken();

      // Database mein save karein
      const { error } = await supabase.from("admin_config").upsert({
        id: 1,
        fcm_token: token, // Humne column ka naam fcm_token rakha tha
        updated_at: new Date(),
      });

      if (error) throw error;
      console.log("FCM Token successfully saved in Supabase!");
    } catch (err) {
      console.log("Token logic error:", err.message);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/");
        return;
      }
      setAuthChecked(true);
      updateAdminToken();
    }
  }, [isLoaded, isSignedIn]);

  const fetchItems = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend response mapping fix
      const fetchedItems = Array.isArray(res.data)
        ? res.data
        : res.data.items || [];
      setItems(fetchedItems);
    } catch (err) {
      console.log("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (authChecked && isSignedIn) fetchItems();
  }, [authChecked, isSignedIn]);

  // --- Image Pickers ---
  const pickMainImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const pickDetailImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled) {
      // Nayi images ko purani (agar hain) ke saath jodein
      setDetailImages([...detailImages, ...result.assets]);
    }
  };

  const removeDetailImage = (index) => {
    setDetailImages(detailImages.filter((_, i) => i !== index));
  };

  // --- Save / Update Logic ---
  const handleSaveItem = async () => {
    if (!price || !category || !itemName) {
      Alert.alert("Rukien!", "Name, Price aur Category bharna zaroori hai.");
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();

      const payload = {
        Name: itemName,
        price: price.toString(),
        description: description || "",
        category: category,
        sizes: selectedSizes,
      };

      // Sirf tab bhejo jab naya image pick kiya ho (Base64 mojood ho)
      if (image?.base64) {
        payload.imageBase64 = `data:image/jpeg;base64,${image.base64}`;
      }

      // Detail images: Sirf wo bhejo jo nayi hain (Base64 wali)
      const newDetailBase64 = detailImages
        .filter((img) => img.base64)
        .map((img) => `data:image/jpeg;base64,${img.base64}`);

      if (newDetailBase64.length > 0) {
        payload.detailImagesBase64 = newDetailBase64;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editId) {
        // UPDATE
        await axios.put(`${API_URL}/api/items/${editId}`, payload, config);
        Alert.alert("Mubarak!", "Item update ho gaya.");
      } else {
        // ADD (POST ke liye imageBase64 zaroori hai)
        if (!image?.base64) {
          Alert.alert("Error", "Naye item ke liye main image lazmi hai.");
          setIsUploading(false);
          return;
        }
        await axios.post(`${API_URL}/api/items`, payload, config);
        Alert.alert("Success!", "Naya item add ho gaya.");
      }

      resetForm();
      fetchItems();
    } catch (err) {
      console.log("Submit Error:", err.response?.data || err.message);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Kuch ghalat ho gaya.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setPrice("");
    setCategory("");
    setItemName("");
    setDescription("");
    setImage(null);
    setDetailImages([]);
    setSelectedSizes([]);
  };

  const startEdit = (item) => {
    setEditId(item.id || item._id);
    setItemName(item.name || item.Name || "");
    setPrice(item.price ? item.price.toString() : "");
    setCategory(item.category || "");
    setDescription(item.description || "");
    setSelectedSizes(item.sizes || []);

    // Cover Preview
    if (item.imageUrl) {
      setImage({ uri: item.imageUrl });
    }

    // Detail Previews
    if (item.detail_image_url && Array.isArray(item.detail_image_url)) {
      setDetailImages(item.detail_image_url.map((url) => ({ uri: url })));
    } else {
      setDetailImages([]);
    }

    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (!authChecked || loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      edges={["top"]}
    >
      <Modal transparent visible={isUploading}>
        <View style={styles.modalOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loaderText}>Uploading to Cloudinary...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {editId ? "📝 Edit Product" : "Admin Panel"}
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Item Name"
            value={itemName}
            onChangeText={setItemName}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="Price"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Category"
              value={category}
              onChangeText={setCategory}
            />
          </View>
          <TextInput
            style={[styles.input, { height: 70 }]}
            placeholder="Description"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Sizes</Text>
          <View style={styles.sizeContainer}>
            {["Small", "Medium", "Large"].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() =>
                  setSelectedSizes((prev) =>
                    prev.includes(s)
                      ? prev.filter((x) => x !== s)
                      : [...prev, s],
                  )
                }
                style={[
                  styles.sizeBtn,
                  selectedSizes.includes(s) && styles.sizeBtnActive,
                ]}
              >
                <Text
                  style={{
                    color: selectedSizes.includes(s) ? "#FFA500" : "#333",
                  }}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.imgPickBtn} onPress={pickMainImage}>
              <Text style={styles.btnText}>📸 Cover Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imgPickBtn, { backgroundColor: "#6c757d" }]}
              onPress={pickDetailImages}
            >
              <Text style={styles.btnText}>🖼️ Add Details</Text>
            </TouchableOpacity>
          </View>

          {/* PREVIEWS */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginVertical: 10,
            }}
          >
            {image && (
              <View>
                <Text style={styles.previewLabel}>Main:</Text>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.mainPreviewImg}
                />
              </View>
            )}
            {detailImages.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>
                  Details ({detailImages.length}):
                </Text>
                <ScrollView horizontal>
                  {detailImages.map((img, index) => (
                    <View key={index} style={styles.detailImgWrapper}>
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.detailPreviewImg}
                      />
                      <TouchableOpacity
                        style={styles.removeImgBadge}
                        onPress={() => removeDetailImage(index)}
                      >
                        <Text style={{ color: "#fff", fontSize: 10 }}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: editId ? "#007BFF" : "#28a745" },
            ]}
            onPress={handleSaveItem}
          >
            <Text style={styles.mainBtnText}>
              {editId ? "Update Now" : "Save Product"}
            </Text>
          </TouchableOpacity>

          {editId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Inventory</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Image source={{ uri: item.imageUrl }} style={styles.listImg} />
            <View style={styles.listContent}>
              <Text style={styles.listName}>{item.name}</Text>
              <Text style={styles.listPrice}>Rs {item.price}</Text>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => startEdit(item)}
              >
                <Text style={styles.btnSmallText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.delBtn}
                onPress={() => {
                  Alert.alert("Delete", "Pakka?", [
                    { text: "No" },
                    {
                      text: "Yes",
                      onPress: async () => {
                        const token = await getToken();
                        await axios.delete(`${API_URL}/api/items/${item.id}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        fetchItems();
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.btnSmallText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: { padding: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  logoutBtn: { backgroundColor: "#ffebee", padding: 8, borderRadius: 8 },
  logoutText: { color: "#d32f2f", fontWeight: "bold" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 20,
    elevation: 4,
  },
  input: {
    backgroundColor: "#fcfcfc",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: { fontWeight: "bold", marginBottom: 8, color: "#555" },
  sizeContainer: { flexDirection: "row", gap: 8, marginBottom: 15 },
  sizeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sizeBtnActive: { borderColor: "#FFA500", backgroundColor: "#fff9f0" },
  imgPickBtn: {
    flex: 1,
    backgroundColor: "#495057",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  previewLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 5,
  },
  mainPreviewImg: { width: 70, height: 70, borderRadius: 10 },
  detailImgWrapper: { marginRight: 8, position: "relative" },
  detailPreviewImg: { width: 70, height: 70, borderRadius: 10 },
  removeImgBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "red",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  mainBtn: {
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  mainBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { marginTop: 10, alignItems: "center" },
  cancelText: { color: "red", fontWeight: "bold" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 15,
  },
  listItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2,
  },
  listImg: { width: 50, height: 50, borderRadius: 8 },
  listContent: { flex: 1, marginLeft: 12 },
  listName: { fontSize: 15, fontWeight: "bold" },
  listPrice: { fontSize: 13, color: "green" },
  listActions: { flexDirection: "row", gap: 5 },
  editBtn: { backgroundColor: "#007BFF", padding: 8, borderRadius: 5 },
  delBtn: { backgroundColor: "#dc3545", padding: 8, borderRadius: 5 },
  btnSmallText: { color: "#fff", fontSize: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
  },
  loaderText: { marginTop: 10, fontWeight: "bold" },
});

export default StylishInputs;
