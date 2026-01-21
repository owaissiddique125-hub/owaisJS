const express = require("express");
const router = express.Router();
const clerkAuth = require("../middleware/clerkAuth");
const supabase = require("../supabase/supbase");
const axios = require("axios");

router.get("/", clerkAuth, async (req, res) => {
  try {
    // 1. Inputs parse karein
    let { page = 1, limit = 15, year, month, day, mode = "all" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Base Queries
    let query = supabase.from("orders").select("*", { count: "exact" });

    // Revenue nikalne ke liye sirf 'total' column mangwa rahe hain taake aggregation error na aaye
    let revenueQuery = supabase.from("orders").select("total");

    // 2. Date Filtering Logic (Specific Day Support ke sath)
    if (mode !== "all" && year && year !== "undefined") {
      let startDate, endDate;

      if (mode === "day" && month && day) {
        // Ek specific din ki sales (Subah 12:00 AM se Raat 11:59 PM)
        startDate = new Date(
          Date.UTC(year, month - 1, day, 0, 0, 0),
        ).toISOString();
        endDate = new Date(
          Date.UTC(year, month - 1, day, 23, 59, 59, 999),
        ).toISOString();
      } else if (mode === "month" && month) {
        // Pure mahine ki sales
        startDate = new Date(
          Date.UTC(year, month - 1, 1, 0, 0, 0),
        ).toISOString();
        endDate = new Date(
          Date.UTC(year, month, 0, 23, 59, 59, 999),
        ).toISOString();
      } else {
        // Pure saal ki sales
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

    // 3. Execution (Parallel fetching)
    const [ordersRes, allTotalsRes] = await Promise.all([
      query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1),
      revenueQuery,
    ]);

    // Error handling
    if (ordersRes.error) throw ordersRes.error;
    if (allTotalsRes.error) throw allTotalsRes.error;

    // 4. Manual Revenue Calculation (Safe & Accurate)
    const totalRevenue = allTotalsRes.data
      ? allTotalsRes.data.reduce(
          (sum, item) => sum + (Number(item.total) || 0),
          0,
        )
      : 0;

    // 5. Response bhejein
    res.json({
      success: true,
      orders: ordersRes.data || [],
      totalCount: ordersRes.count || 0,
      totalRevenue: totalRevenue,
      currentPage: page,
    });
  } catch (err) {
    console.error("Sales Route Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
});
router.patch("/:id", clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Order aur Customer ka Token nikalein (Maan lijiye token 'orders' table mein hi hai ya join hai)
    // Agar token user table mein hai toh pehle order fetch karke user_id nikalni hogi
    const { data: orderData, error: fetchError } = await supabase
      .from("orders")
      .select("*, customer_token") // Maan lein 'customer_token' column ka naam hai
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Status Update karein
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: status })
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Notification Bhejein (Agar token maujood hai)
    if (orderData.customer_token) {
      try {
        await axios.post("https://exp.host/--/api/v2/push/send", {
          to: orderData.customer_token,
          title: "Order Update! 🛒",
          body: `Your Order Has Been '${status}' `,
          data: { orderId: id },
        });
      } catch (pusherror) {
        console.log("The error is cooming ", pusherror);
      }
    }

    res.json({ success: true, message: "Updated and Notified" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
