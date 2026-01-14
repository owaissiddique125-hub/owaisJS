import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import axios from "axios";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || "https://owais-js-wtoy.vercel.app";
 



const STATUS_COLORS = {
  pending: "#FFA500",
  accepted: "#1E90FF",
  delivered: "#28A745",
};


const AdminOrdersScreen = () => {
const { getToken } = useClerkAuth();
  
  const [orders, setOrders] = useState([]);
  
  const fetchOrders = async () =>{
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

const updateStatus = async (orderId, newStatus) => {
  try {
    const token = await getToken();
    const { data } = await axios.patch(`${API_URL}/api/orders/${orderId}`, {
      status: newStatus,
    },{
      headers: { Authorization: `Bearer ${token}` }
    });

    if (data.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id.toString() === orderId.toString() ? { ...o, status: newStatus } : o
        )
      );
    } else {
      alert("Update failed");
    }
  } catch (error) {
    console.log("Update error:", error.message);
  }
};
useEffect(() => {
  let isMounted = true; // cleanup flag

  const fetchInterval = async () => {
    if (!isMounted) return;
    await fetchOrders();
  };

  fetchInterval(); // first call on mount

  const interval = setInterval(fetchInterval, 5000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, []);

  const renderOrderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.rowBetween}>
        <Text style={styles.name}>
          👤 {item.first_name} {item.last_name}
        </Text>
        <Text style={styles.phone}>📞 {item.PhoneNumber}</Text>
      </View>

      {/* Address */}
      <Text style={styles.address}>
        📍 {item.street}, {item.city} (Zip: {item.zip})
      </Text>

      {/* Items */}
      <View style={{ marginVertical: 8 }}>
        <Text style={styles.bold}>🛒 Items:</Text>
       {Array.isArray(item.items) &&
  item.items.map((i, index) => (
    <Text key={index} style={styles.itemText}>
      • {i.Name}
      {i.size ? ` (${i.size})` : ""} 
      x {i.quantity} = Rs {i.price * i.quantity}
    </Text>
))}
      </View>

      {/* Total & Status */}
      <View style={styles.rowBetween}>
        <Text style={styles.total}>💰 Rs {item.total}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] || "#888" },
          ]}
        >
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Map */}
      {item.maps_link && (
        <TouchableOpacity
          onPress={() => Linking.openURL(item.maps_link)}
          style={styles.mapBtn}
        >
          <Text style={styles.mapText}>📍 Open Location</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {item.status === "pending" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#FFA500" }]}
            onPress={() => updateStatus(item.id, "accepted")}
          >
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
        )}
        {item.status === "accepted" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#28A745" }]}
            onPress={() => updateStatus(item.id, "delivered")}
          >
            <Text style={styles.btnText}>Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <Text style={styles.title}>Admin Orders Dashboard</Text>
        }
      />
    </SafeAreaView>
  );
};

export default AdminOrdersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 15,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 18,
    borderRadius: 15,
    elevation: 5,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontWeight: "bold",
    fontSize: 18,
  },
  phone: {
    color: "#555",
    fontSize: 14,
  },
  address: {
    color: "#555",
    marginVertical: 6,
  },
  bold: {
    fontWeight: "bold",
  },
  itemText: {
    color: "#333",
    fontSize: 14,
  },
  total: {
    fontWeight: "bold",
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
  },
  mapBtn: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    alignItems: "center",
  },
  mapText: {
    color: "#1A73E8",
    fontWeight: "bold",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginLeft: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
});
