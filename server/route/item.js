const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const clerkAuth = require('../middleware/clerkAuth');
const supabase = require("../supabase/supbase");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/items
 * Get all items
 */
router.get('/', clerkAuth, async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        category: item.category,
        imageUrl: item.cover_image_url,
        description: item.description,
        available: item.available,
        createdAt: item.created_at,
        detail_image_url: item.detail_image_url, 
      })),
      count: items.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items
 * Add new item
 */
router.post('/', clerkAuth, [
    body('Name').trim().notEmpty().withMessage('Item name is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('category').notEmpty().withMessage('Category is required'),
    body('imageBase64').notEmpty().withMessage('Image is required'),
  ],
  async (req, res, next) => {
    try {
      const { Name, price, category, description, imageBase64, sizes, detailImagesBase64 } = req.body;

      // Upload Main Image
      const mainResult = await cloudinary.uploader.upload(imageBase64, { folder: 'food-items' });

      // Upload Detail Images
      let detailUrls = [];
      if (Array.isArray(detailImagesBase64)) {
        for (let img of detailImagesBase64) {
          const res = await cloudinary.uploader.upload(img, { folder: 'food-items/details' });
          detailUrls.push(res.secure_url);
        }
      }

      const { data: item, error } = await supabase.from('items').insert({
        name: Name,
        price: parseFloat(price),
        category: category,
        cover_image_url: mainResult.secure_url,
        description: description || null,
        available: true,
        sizes: sizes || [],
        detail_image_url: detailUrls
      }).select().single();

      if (error) throw error;

      res.status(201).json({ success: true, item: { ...item, imageUrl: item.cover_image_url } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/items/:id
 * Update existing item (Missing Update logic added here)
 */
router.put('/:id', clerkAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Name, price, category, description, imageBase64, sizes, detailImagesBase64 } = req.body;

    let updateData = {
      name: Name,
      price: parseFloat(price),
      category: category,
      description: description || null,
      sizes: sizes || [],
    };

    // Agar nayi main image aayi hai toh upload karo
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const result = await cloudinary.uploader.upload(imageBase64, { folder: 'food-items' });
      updateData.cover_image_url = result.secure_url;
    }

    // Agar nayi detail images aayi hain
    if (Array.isArray(detailImagesBase64) && detailImagesBase64.length > 0) {
      let newDetailUrls = [];
      for (let img of detailImagesBase64) {
        if (img.startsWith('data:image')) {
          const res = await cloudinary.uploader.upload(img, { folder: 'food-items/details' });
          newDetailUrls.push(res.secure_url);
        }
      }
      if (newDetailUrls.length > 0) updateData.detail_image_url = newDetailUrls;
    }

    const { data: updatedItem, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Item Updated Successfully",
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        price: parseFloat(updatedItem.price),
        imageUrl: updatedItem.cover_image_url,
        detail_image_url: updatedItem.detail_image_url
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/items/:id
 */
router.delete('/:id', clerkAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;