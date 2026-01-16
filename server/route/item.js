/**
 * PUT /api/items/:id
 * Update food item (Admin only)
 */
router.put('/:id', clerkAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Name, price, category, description, imageBase64, sizes, detailImagesBase64 } = req.body;

    // 1. Pehle purana data lao taake purani images ka pata chale
    const { data: existingItem } = await supabase.from('items').select('*').eq('id', id).single();
    if (!existingItem) return res.status(404).json({ success: false, message: "Item not found" });

    let updateData = {
      name: Name,
      price: parseFloat(price),
      category: category,
      description: description || null,
      sizes: sizes,
    };

    // 2. Agar Nayi Cover Image bheji hai toh Cloudinary pe upload karo
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const cloudinaryResult = await cloudinary.uploader.upload(imageBase64, {
        folder: 'food-items',
        resource_type: 'image',
      });
      updateData.cover_image_url = cloudinaryResult.secure_url;
    }

    // 3. Agar Nayi Detail Images bheji hain toh upload karo
    if (Array.isArray(detailImagesBase64) && detailImagesBase64.length > 0) {
      let detailImageUrls = [];
      for (let img of detailImagesBase64) {
        if (img.startsWith('data:image')) {
          const result = await cloudinary.uploader.upload(img, {
            folder: 'food-items/details',
            resource_type: 'image',
          });
          detailImageUrls.push(result.secure_url);
        }
      }
      if (detailImageUrls.length > 0) {
        updateData.detail_image_url = detailImageUrls;
      }
    }

    // 4. Supabase mein update karo
    const { data: item, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, message: 'Item updated successfully', item });
  } catch (error) {
    console.error('Update Error:', error);
    next(error);
  }
});