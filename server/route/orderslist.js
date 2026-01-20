const express = require("express");
const router = express.Router();
const clerkAuth = require("../middleware/clerkAuth");
const supabase = require("../supabase/supbase");

// --- 1. GET ALL ORDERS (With Filters & Revenue) ---
router.get("/", clerkAuth, async (req, res) => {
  try {
    let { page = 1, limit = 15, year, month, day, mode = "all" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let query = supabase.from("orders").select("*", { count: "exact" });
    let revenueQuery = supabase.from("orders").select("total");

    // Date Filtering Logic
    if (mode !== "all" && year && year !== "undefined") {
      let startDate, endDate;
      if (mode === "day" && month && day) {
        startDate = new Date(
          Date.UTC(year, month - 1, day, 0, 0, 0),
        ).toISOString();
        endDate = new Date(
          Date.UTC(year, month - 1, day, 23, 59, 59, 999),
        ).toISOString();
      } else if (mode === "month" && month) {
        startDate = new Date(
          Date.UTC(year, month - 1, 1, 0, 0, 0),
        ).toISOString();
        endDate = new Date(
          Date.UTC(year, month, 0, 23, 59, 59, 999),
        ).toISOString();
      } else {
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
        endDate = new Date(
          Date.UTC(year, 11, 31, 23, 59, 59, 999),
        ).toISOString();
      }
      query = query.gte("created_at", startDate).lte("created_at", endDate);
      revenueQuery = revenueQuery
        .gte("created_at", startDate)
        .lte("created_at", endDate);
    }

    const [ordersRes, allTotalsRes] = await Promise.all([
      query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1),
      revenueQuery,
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (allTotalsRes.error) throw allTotalsRes.error;

    const totalRevenue = allTotalsRes.data
      ? allTotalsRes.data.reduce(
          (sum, item) => sum + (Number(item.total) || 0),
          0,
        )
      : 0;

    res.json({
      success: true,
      orders: ordersRes.data || [],
      totalCount: ordersRes.count || 0,
      totalRevenue: totalRevenue,
      currentPage: page,
    });
  } catch (err) {
    console.error("Sales Route Error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
});

// --- 2. PATCH UPDATE ORDER STATUS (GET ke bahar alag se) ---
router.patch("/:id", clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📦 Updating Order ${id} to status: ${status}`);

    const { data, error } = await supabase
      .from("orders")
      .update({ status: status })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      message: "Status updated successfully",
      order: data[0],
    });
  } catch (err) {
    console.error("Patch Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
