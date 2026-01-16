import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import axios from "axios";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Avatar, Button, Card, SegmentedButtons, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || "https://owais-js-wtoy.vercel.app";

const STATUS_COLORS = {
  pending: "#FFA500",
  accepted: "#1E90FF",
  delivered: "#28A745",
};

const AdminOrdersScreen = () => {
  const { getToken } = useClerkAuth();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState('day'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchOrders = async () => {
    if (!refreshing) setLoading(true);
    try {
      const token = await getToken();
      const [year, month, day] = selectedDate.split('-');
      
      const response = await axios.get(`${API_URL}/api/orders`, {
        params: { mode: filterMode, year, month, day, limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
        applySearch(searchQuery, response.data.orders);
      }
    } catch (error) {
      console.log("Fetch Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applySearch = (query, allOrders = orders) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrders(allOrders);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allOrders.filter(order => {
      const fName = String(order.first_name || "").toLowerCase();
      const lName = String(order.last_name || "").toLowerCase();
      const phone = String(order.PhoneNumber || "").toLowerCase();
      const oId = String(order.id || "").toLowerCase();
      return fName.includes(lowerQuery) || lName.includes(lowerQuery) || phone.includes(lowerQuery) || oId.includes(lowerQuery);
    });
    setFilteredOrders(filtered);
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const token = await getToken();
      const { data } = await axios.patch(`${API_URL}/api/orders/${orderId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        const updated = orders.map((o) => o.id === orderId ? { ...o, status: newStatus } : o);
        setOrders(updated);
        applySearch(searchQuery, updated);
      }
    } catch (error) {
      alert("Status update failed");
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filterMode, selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [filterMode, selectedDate]);

  const renderOrderItem = ({ item }) => (
    <Surface style={styles.card} elevation={2}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>👤 {item.first_name} {item.last_name}</Text>
          <Text style={styles.phone}>📞 {item.PhoneNumber || 'No Phone'}</Text>
          <Text style={styles.orderIdText}>ID: #{item.id.toString().slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || "#888" }]}>
          <Text style={styles.badgeText}>{item.status?.toUpperCase() || 'PENDING'}</Text>
        </View>
      </View>
      <Text style={styles.address}>📍 {item.street}, {item.city}</Text>
      <View style={styles.divider} />
      <Text style={styles.bold}>🛒 Items:</Text>
      {item.items?.map((i, idx) => (
        <Text key={idx} style={styles.itemText}>• {i.Name} x{i.quantity} (Rs {i.price})</Text>
      ))}
      <View style={styles.footer}>
        <Text style={styles.total}>Rs {Number(item.total).toLocaleString()}</Text>
        <View style={styles.actions}>
          {item.status === "pending" && (
            <Button mode="contained" buttonColor="#1E90FF" compact onPress={() => updateStatus(item.id, "accepted")}>Accept</Button>
          )}
          {item.status === "accepted" && (
            <Button mode="contained" buttonColor="#28A745" compact onPress={() => updateStatus(item.id, "delivered")}>Deliver</Button>
          )}
        </View>
      </View>
      {item.maps_link && (
        <TouchableOpacity onPress={() => Linking.openURL(item.maps_link)} style={styles.mapBtn}>
          <Text style={styles.mapText}>View Location</Text>
        </TouchableOpacity>
      )}
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search aur Filters ab upar hain, FlatList se bahar */}
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>Orders Manager</Text>
        <Surface style={styles.searchContainer} elevation={2}>
          <Avatar.Icon size={30} icon="magnify" backgroundColor="transparent" color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone or ID..."
            value={searchQuery}
            onChangeText={(text) => applySearch(text)}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => applySearch("")}>
              <Avatar.Icon size={30} icon="close-circle" backgroundColor="transparent" color="#999" />
            </TouchableOpacity>
          )}
        </Surface>
        
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'day', label: 'Day' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
          style={styles.segment}
        />

        {filterMode !== 'all' && (
          <Button 
            mode="contained-tonal" 
            onPress={() => setShowCalendar(!showCalendar)}
            icon="calendar"
            style={styles.calBtn}
          >
            {selectedDate}
          </Button>
        )}
      </View>

      {showCalendar && (
        <Card style={styles.calendarCard}>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={{ [selectedDate]: { selected: true, selectedColor: '#6200ee' } }}
          />
        </Card>
      )}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading && <Text style={styles.empty}>No orders found.</Text>}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  fixedHeader: { padding: 16, backgroundColor: "#f8f9fa" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 8, marginBottom: 15, height: 48 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 5 },
  segment: { marginBottom: 10 },
  calBtn: { marginBottom: 5, borderRadius: 10 },
  calendarCard: { marginHorizontal: 16, marginBottom: 15, borderRadius: 15, overflow: 'hidden' },
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: 'flex-start' },
  name: { fontWeight: "bold", fontSize: 16 },
  phone: { color: "#666", fontSize: 13, marginTop: 2 },
  orderIdText: { fontSize: 10, color: '#999', marginTop: 2 },
  address: { color: "#444", marginVertical: 8, fontSize: 13 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 10 },
  bold: { fontWeight: "bold", marginBottom: 5 },
  itemText: { fontSize: 12, color: "#555" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  total: { fontWeight: "800", fontSize: 17, color: "#2e7d32" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  mapBtn: { marginTop: 12, padding: 10, backgroundColor: "#f0eaff", borderRadius: 10, alignItems: "center" },
  mapText: { color: "#6200ee", fontWeight: "bold", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  actions: { flexDirection: 'row' }
});

export default AdminOrdersScreen;