const express = require("express");
const router = express.Router()
const clerkAuth = require('../middleware/clerkAuth');
const supabase = require("../supabase/supbase");

router.get('/',clerkAuth, async (req,res)=>
{
try{
  const {data ,error} = await supabase
.from('orders')
.select('*')
.order('created_at',{ascending:false});
if(error) throw error

res.json({ success: true, orders: data});

}
catch(err){
  console.log("Eroor While fetching data",err);
  res.status(500).json({success : false, message: "data fetching error"})
}
});
router.patch("/:id", clerkAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.log("Update error:", err);
    res.status(500).json({ success: false });
  }
});


module.exports = router;