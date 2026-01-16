const express = require("express");
const router = express.Router();
const clerkAuth = require("../middleware/clerkAuth");
const supabase = require("../supabase/supbase");

router.get("/", clerkAuth, async (req, res) => {
  try {
    let { page = 1, limit = 15, year, month } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // 1. Base Queries
    // Main query: Saara data fetch karne ke liye (Paginated)
    let query = supabase.from("orders").select("*", { count: "exact" });
    
    // Revenue query: Sirf 'total' column mangwa rahe hain (Error fix karne ke liye)
    let revenueQuery = supabase.from("orders").select("total");

    // 2. Filter Logic (Timezone safe dates)
    if (year && year !== 'undefined' && year !== 'all') {
      let startDate, endDate;

      if (month && month !== 'undefined') {
        // Specific Month Filter
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
      } else {
        // Full Year Filter
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
        endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString();
      }

      query = query.gte("created_at", startDate).lte("created_at", endDate);
      revenueQuery = revenueQuery.gte("created_at", startDate).lte("created_at", endDate);
    }

    // 3. Execution (Donon queries ko ek sath chalana)
    const [ordersRes, allTotalsRes] = await Promise.all([
      query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, (page * limit) - 1),
      revenueQuery
    ]);

    // Error check
    if (ordersRes.error) throw ordersRes.error;
    if (allTotalsRes.error) throw allTotalsRes.error;

    // 4. Server-Side Revenue Calculation (Sabse Safe Tareeka)
    // Ye line aapka "Aggregate function" wala error fix karegi
    const totalRevenue = allTotalsRes.data 
      ? allTotalsRes.data.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
      : 0;

    // 5. Final Response
    res.json({
      success: true,
      orders: ordersRes.data || [],
      totalCount: ordersRes.count || 0,
      totalRevenue: totalRevenue, 
      currentPage: page
    });

  } catch (err) {
    console.error("Sales Route Error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server Error: Data fetch nahi ho saka",
      error: err.message 
    });
  }
});

module.exports = router;