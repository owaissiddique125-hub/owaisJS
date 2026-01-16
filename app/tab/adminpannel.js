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
  const [image, setImage] = useState(null); // Main Cover Image
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [detailImages, setDetailImages] = useState([]); // Multiple Detail Images
  const [selectedSizes, setSelectedSizes] = useState([]);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) { router.replace("/"); return; }
      setAuthChecked(true);
    }
  }, [isLoaded, isSignedIn]);

  const fetchItems = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch (err) { console.log("Fetch Error:", err.message); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { if (authChecked && isSignedIn) fetchItems(); }, [authChecked, isSignedIn]);

  // --- Image Pickers with Preview ---
  const pickMainImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Fast upload
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
      setDetailImages([...detailImages, ...result.assets]);
    }
  };

  const removeDetailImage = (index) => {
    setDetailImages(detailImages.filter((_, i) => i !== index));
  };

  // --- Save / Update Logic ---
  const handleSaveItem = async () => {
    if (!price || !category || !itemName || (!image && !editId)) {
      Alert.alert("Rukien!", "Saari fields aur kam se kam Cover Image zaroori hai.");
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      const payload = {
        Name: itemName,
        price: price.toString(),
        description,
        category,
        sizes: selectedSizes,
      };

      if (image?.base64) payload.imageBase64 = `data:image/jpeg;base64,${image.base64}`;
      
      const newDetailImages = detailImages.filter(img => img.base64);
      if (newDetailImages.length > 0) {
        payload.detailImagesBase64 = newDetailImages.map(img => `data:image/jpeg;base64,${img.base64}`);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editId) {
        await axios.put(`${API_URL}/api/items/${editId}`, payload, config);
        Alert.alert("Mubarak!", "Item update ho gaya.");
      } else {
        await axios.post(`${API_URL}/api/items`, payload, config);
        Alert.alert("Success!", "Naya item add ho gaya.");
      }

      resetForm();
      fetchItems();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Kuch ghalat ho gaya.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setEditId(null); setPrice(""); setCategory(""); setItemName("");
    setDescription(""); setImage(null); setDetailImages([]); setSelectedSizes([]);
  };

  const startEdit = (item) => {
    setEditId(item.id || item._id);
    setItemName(item.Name || item.name);
    setPrice(item.price?.toString());
    setCategory(item.category);
    setDescription(item.description || "");
    setSelectedSizes(item.sizes || []);
    setImage({ uri: item.imageUrl || item.image_url });
    setDetailImages([]); // Detail images update ke waqt naye sire se select hongee
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (!authChecked || loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFA500" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }} edges={["top"]}>
      <Modal transparent visible={isUploading}>
        <View style={styles.modalOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loaderText}>Processing Data...</Text>
            <Text style={{fontSize: 12, color: '#666'}}>Please wait, uploading images</Text>
          </View>
        </View>
      </Modal>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{editId ? "📝 Edit Item" : "Admin Panel"}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Item Name" value={itemName} onChangeText={setItemName} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Category" value={category} onChangeText={setCategory} />
          </View>
          <TextInput style={[styles.input, { height: 70 }]} placeholder="Description" multiline value={description} onChangeText={setDescription} />

          {/* Size Selection */}
          <Text style={styles.label}>Sizes</Text>
          <View style={styles.sizeContainer}>
            {["Small", "Medium", "Large"].map(s => (
              <TouchableOpacity key={s} onPress={() => setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                style={[styles.sizeBtn, selectedSizes.includes(s) && styles.sizeBtnActive]}>
                <Text style={{ color: selectedSizes.includes(s) ? "#FFA500" : "#333" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image Selection Buttons */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.imgPickBtn} onPress={pickMainImage}>
              <Text style={styles.btnText}>📸 Cover Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.imgPickBtn, {backgroundColor: '#6c757d'}]} onPress={pickDetailImages}>
              <Text style={styles.btnText}>🖼️ Detail Images</Text>
            </TouchableOpacity>
          </View>

          {/* COVER IMAGE PREVIEW */}
          {image && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Cover Preview:</Text>
              <Image source={{ uri: image.uri }} style={styles.mainPreviewImg} />
            </View>
          )}

          {/* DETAIL IMAGES PREVIEW */}
          {detailImages.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Details Preview ({detailImages.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {detailImages.map((img, index) => (
                  <View key={index} style={styles.detailImgWrapper}>
                    <Image source={{ uri: img.uri }} style={styles.detailPreviewImg} />
                    <TouchableOpacity style={styles.removeImgBadge} onPress={() => removeDetailImage(index)}>
                      <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: editId ? "#007BFF" : "#28a745" }]} onPress={handleSaveItem}>
            <Text style={styles.mainBtnText}>{editId ? "Update Product" : "Save Product"}</Text>
          </TouchableOpacity>

          {editId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelText}>❌ Cancel & Close Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Product Inventory</Text>

        {items.map((item) => (
          <View key={item.id || item._id} style={styles.listItem}>
            <Image source={{ uri: item.imageUrl || item.image_url }} style={styles.listImg} />
            <View style={styles.listContent}>
              <Text style={styles.listName} numberOfLines={1}>{item.Name || item.name}</Text>
              <Text style={styles.listPrice}>Rs {item.price}</Text>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                <Text style={styles.btnSmallText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => {
                Alert.alert("Delete", "Kya aap waqai mitaana chahte hain?", [
                  { text: "Nahi" },
                  { text: "Haan", onPress: async () => {
                    const token = await getToken();
                    await axios.delete(`${API_URL}/api/items/${item.id || item._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    fetchItems();
                  }}
                ]);
              }}>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  logoutBtn: { backgroundColor: "#ffebee", padding: 8, borderRadius: 8 },
  logoutText: { color: "#d32f2f", fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  input: { backgroundColor: "#fcfcfc", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { fontWeight: "bold", marginBottom: 8, color: "#555" },
  sizeContainer: { flexDirection: "row", gap: 8, marginBottom: 15 },
  sizeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  sizeBtnActive: { borderColor: "#FFA500", backgroundColor: "#fff9f0" },
  imgPickBtn: { flex: 1, backgroundColor: "#495057", padding: 12, borderRadius: 12, alignItems: "center", marginHorizontal: 4 },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  previewContainer: { marginVertical: 10 },
  previewLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 5 },
  mainPreviewImg: { width: 100, height: 100, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  detailImgWrapper: { marginRight: 10, position: 'relative' },
  detailPreviewImg: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  removeImgBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  mainBtn: { padding: 16, borderRadius: 15, alignItems: "center", marginTop: 10 },
  mainBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  cancelText: { color: '#d32f2f', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 25, marginBottom: 15 },
  listItem: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 15, marginBottom: 10, alignItems: "center" },
  listImg: { width: 55, height: 55, borderRadius: 10 },
  listContent: { flex: 1, marginLeft: 15 },
  listName: { fontSize: 15, fontWeight: "bold" },
  listPrice: { fontSize: 13, color: "#28a745", marginTop: 2 },
  listActions: { flexDirection: "row", gap: 8 },
  editBtn: { backgroundColor: "#007BFF", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  delBtn: { backgroundColor: "#dc3545", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnSmallText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  loaderCard: { backgroundColor: "#fff", padding: 30, borderRadius: 20, alignItems: "center" },
  loaderText: { marginTop: 10, fontWeight: "bold", fontSize: 16 }
});

export default StylishInputs;