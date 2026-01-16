/**
 * PUT /api/items/:id
 * Update food item logic
 */
router.put('/:id', clerkAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Name, price, category, description, imageBase64, sizes, detailImagesBase64 } = req.body;

    // 1. Check karein item exist karta hai
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingItem) {
      return res.status(404).json({ success: false, message: "Item nahi mila" });
    }

    let updateData = {
      name: Name,
      price: parseFloat(price),
      category: category,
      description: description || null,
      sizes: sizes || [],
    };

    // 2. Agar Nayi Main Image aayi hai toh Cloudinary pe bhejo
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const cloudinaryResult = await cloudinary.uploader.upload(imageBase64, {
        folder: 'food-items',
        resource_type: 'image',
      });
      updateData.cover_image_url = cloudinaryResult.secure_url;
    }

    // 3. Agar Nayi Detail Images aayi hain
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

    // 4. Supabase mein data save karein
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Response wese hi bhejo jese GET route bhejta hai
    res.json({
      success: true,
      message: 'Item update ho gaya',
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        price: parseFloat(updatedItem.price),
        category: updatedItem.category,
        imageUrl: updatedItem.cover_image_url,
        description: updatedItem.description,
        detail_image_url: updatedItem.detail_image_url,
        available: updatedItem.available
      }
    });
  } catch (error) {
    console.error('Update Error:', error);
    next(error);
  }
});