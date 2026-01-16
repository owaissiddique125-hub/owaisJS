const express = require("express");
const router = express.Router();
const clerkAuth = require("../middleware/clerkAuth");
const supabase = require("../supabase/supbase");

router.get("/", clerkAuth, async (req, res) => {
  try {
    // 1. Inputs ko parse aur validate karein
    let { page = 1, limit = 15, year, month } = req.query;
    page = Math.max(1, parseInt(page)); // Kam se kam page 1 ho
    limit = parseInt(limit);

    // 2. Base Queries banayein
    // Count exact: True taake pagination ko pata ho total kitne pages hain
    let query = supabase.from("orders").select("*", { count: "exact" });
    
    // Database level aggregation: Bohot fast aur memory-efficient
    let revenueQuery = supabase.from("orders").select("total.sum()");

    // 3. Filter Logic (Timezone safe dates)
    if (year && year !== 'undefined' && year !== 'all') {
      let startDate, endDate;

      if (month && month !== 'undefined') {
        // Mahine ka filter: UTC format use karna best hai servers ke liye
        // new Date(year, month, 0) khud hi 28/30/31 din handle kar leta hai
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
      } else {
        // Pure saal ka filter
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
        endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString();
      }

      // Dono queries par filters apply karein
      query = query.gte("created_at", startDate).lte("created_at", endDate);
      revenueQuery = revenueQuery.gte("created_at", startDate).lte("created_at", endDate);
    }

    // 4. Execution (Parallel fetching taake response jaldi jaye)
    // .single() ki jagah hum direct result handle karenge taake 0 rows par crash na ho
    const [ordersRes, revenueRes] = await Promise.all([
      query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1),
      revenueQuery
    ]);

    // Error checking
    if (ordersRes.error) throw ordersRes.error;
    if (revenueRes.error) throw revenueRes.error;

    // 5. Response bhejein
    // revenueRes.data[0].sum Supabase ka standard response format hai aggregation ke liye
    const totalRevenueSum = revenueRes.data?.[0]?.sum || 0;

    res.json({
      success: true,
      orders: ordersRes.data || [],
      totalCount: ordersRes.count || 0, // Database mein total kitne hain
      totalRevenue: totalRevenueSum,    // Database se calculated sum
      currentPage: page,
      limit: limit
    });

  } catch (err) {
    console.error("Sales Route Error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server Error: Sales data fetch nahi ho saka",
      error: err.message 
    });
  }
});

module.exports = router;