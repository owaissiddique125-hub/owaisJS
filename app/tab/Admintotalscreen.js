import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import axios from "axios";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const monthNames = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december"
];

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || "https://owais-js-wtoy.vercel.app";
 

const AdminSalesScreen = () => {
  const {getToken} = useClerkAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    
    try{
     const token = await getToken();
    const response = await axios.get(`${API_URL}/api/orders`,{
   
     headers:{
           Authorization: `Bearer ${token}`,
     }
    })
    if( response.data.success){
     setOrders(response.data.orders)
    }
   else{
     alert("frontend error")
   }} catch(Eroor)
   {
   console.log("this is the Error ",Eroor)
   }
   } 
   

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter logic
  useEffect(() => {
    let temp = [...orders];

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();

      temp = temp.filter((o) => {
        const fullName = `${o.first_name} ${o.last_name}`.toLowerCase();
        const orderDate = new Date(o.created_at);
        const orderMonth = monthNames[orderDate.getMonth()];
        const orderYear = orderDate.getFullYear().toString();

        // Match by name, month, or year
        return (
          fullName.includes(lowerSearch) ||
          orderMonth.includes(lowerSearch) ||
          orderYear.includes(lowerSearch)
        );
      });
    }

    setFilteredOrders(temp);
  }, [search, orders]);

  // Calculate total sales safely
  const totalSales = filteredOrders.reduce((sum, o) => {
    // Convert to number safely, remove commas/spaces
    const num = Number(String(o.total).replace(/,/g, "").trim()) || 0;
    return sum + num;
  }, 0);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView style={{ padding: 15, backgroundColor: "#F7F7F7" }}>
        <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 15 }}>
          Sales Overview
        </Text>

        {/* Search Input */}
        <TextInput
          placeholder="Search by Name, Month or Year..."
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            paddingHorizontal: 15,
            paddingVertical: 8,
            marginBottom: 15,
            backgroundColor: "#fff",
          }}
        />

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: "#fff",
                padding: 15,
                borderRadius: 10,
                marginBottom: 10,
                elevation: 3,
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                {item.first_name} {item.last_name}
              </Text>
              <Text>📞 {item.PhoneNumber}</Text>
              <Text>💰 Rs {Number(item.total).toLocaleString()}</Text>
              <Text style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />

        {/* Total Sales */}
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#FFA500",
              padding: 15,
              borderRadius: 10,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
              Total Sales: Rs {totalSales.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminSalesScreen;
