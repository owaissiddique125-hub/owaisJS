// --- Save / Update Logic ---
  const handleSaveItem = async () => {
    // Validation: Edit ke waqt image zaroori nahi agar pehle se hai
    if (!price || !category || !itemName) {
      Alert.alert("Rukien!", "Name, Price aur Category zaroori hain.");
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
        sizes: selectedSizes || [],
      };

      // 1. Cover Image Logic
      // Agar base64 hai toh naya upload karo, warna purana URL hi rehne do
      if (image?.base64) {
        payload.imageBase64 = `data:image/jpeg;base64,${image.base64}`;
      } else if (image?.uri && editId) {
        // Edit mode mein agar image change nahi ki, toh backend ko URL bhej sakte hain
        // Ya backend khud hi handle kar lega agar imageBase64 empty ho
        payload.currentImageUrl = image.uri; 
      }

      // 2. Detail Images Logic
      const newDetails = detailImages.filter(img => img.base64);
      if (newDetails.length > 0) {
        payload.detailImagesBase64 = newDetails.map(img => `data:image/jpeg;base64,${img.base64}`);
      }

      const config = { 
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        } 
      };

      if (editId) {
        console.log("Updating Item ID:", editId);
        const res = await axios.put(`${API_URL}/api/items/${editId}`, payload, config);
        if (res.data.success) Alert.alert("Item Has Been Updated");
      } else {
        // Naye item ke liye image lazmi hai
        if (!image?.base64) {
           Alert.alert("PLease select Image");
           setIsUploading(false);
           return;
        }
        await axios.post(`${API_URL}/api/items`, payload, config);
        Alert.alert("Success!", "Item ha been updated .");
      }

      resetForm();
      await fetchItems(); // List ko refresh karein
    } catch (err) {
      console.log("Error Response:", err.response?.data);
      Alert.alert("Error", err.response?.data?.message || "Action failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (item) => {
    setEditId(item.id || item._id);
    setItemName(item.Name || item.name || "");
    setPrice(item.price ? item.price.toString() : "");
    setCategory(item.category || "");
    setDescription(item.description || "");
    setSelectedSizes(item.sizes || []);
    
    // Cover image preview set karein
    if (item.imageUrl || item.image_url) {
      setImage({ uri: item.imageUrl || item.image_url });
    }

    // Purani Detail images ko bhi preview mein dikhayen
    if (item.detail_image_url && Array.isArray(item.detail_image_url)) {
      const existingDetails = item.detail_image_url.map(url => ({ uri: url }));
      setDetailImages(existingDetails);
    } else {
      setDetailImages([]);
    }

    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };