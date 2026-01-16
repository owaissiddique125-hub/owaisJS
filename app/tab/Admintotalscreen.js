import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import axios from "axios";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { Avatar, Button, Card, List, SegmentedButtons, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || "https://owais-js-wtoy.vercel.app";

const AdminSalesScreen = () => {
  const { getToken } = useClerkAuth();
  
  // --- States ---
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0); 
  const [totalOrdersInDB, setTotalOrdersInDB] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isListEnd, setIsListEnd] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Fetch Function ---
  const fetchOrders = async (pageNumber, shouldRefresh = false) => {
    if (pageNumber === 1 && !refreshing) setLoading(true);
    if (pageNumber > 1) setLoadingMore(true);

    try {
      const token = await getToken();
      const [year, month, day] = selectedDate.split('-');
      
      // Backend ko mode aur date parts dono bhej rahe hain
      let queryParams = { 
        page: pageNumber, 
        limit: 15,
        mode: filterMode,
        year, 
        month, 
        day 
      };

      const response = await axios.get(`${API_URL}/api/orders`, {
        params: queryParams,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTotalRevenue(Number(response.data.totalRevenue) || 0);
        setTotalOrdersInDB(Number(response.data.totalCount) || 0);
        
        const newOrders = response.data.orders || [];

        if (shouldRefresh) {
          setOrders(newOrders);
          setIsListEnd(newOrders.length < 15);
        } else {
          setOrders(prev => [...prev, ...newOrders]);
          setIsListEnd(newOrders.length < 15);
        }
        setPage(pageNumber);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Sales data load nahi ho saka. Connection check karein.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Jab bhi filter ya date badle, refresh karein
  useEffect(() => {
    setOrders([]); 
    setTotalRevenue(0);
    setIsListEnd(false);
    fetchOrders(1, true);
  }, [filterMode, selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(1, true);
  }, [filterMode, selectedDate]);

  const handleLoadMore = () => {
    if (!loadingMore && !isListEnd && !loading && orders.length >= 15) {
      fetchOrders(page + 1);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Revenue Card */}
      <Surface style={styles.mainStatsCard} elevation={4}>
        <View style={styles.revenueHeader}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.revenueAmount}>
          Rs {Number(totalRevenue).toLocaleString()}
        </Text>
        <View style={styles.divider} />
        <View style={styles.statsFooter}>
            <Text style={styles.filterInfo}>
               {filterMode === 'all' ? "All-Time" : `${filterMode.toUpperCase()}: ${selectedDate}`}
            </Text>
            <Text style={styles.totalDbCount}>Orders: {totalOrdersInDB}</Text>
        </View>
      </Surface>

      {/* Filter Buttons */}
      <View style={styles.controlsSection}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'all', label: 'All', icon: 'infinity' },
            { value: 'day', label: 'Day', icon: 'calendar-today' },
            { value: 'month', label: 'Month', icon: 'calendar-month' },
            { value: 'year', label: 'Year', icon: 'calendar-range' },
          ]}
          style={styles.segment}
          theme={{ colors: { primary: '#6200ee' } }}
        />

        {filterMode !== 'all' && (
          <Button 
            mode="contained-tonal" 
            onPress={() => setShowCalendar(!showCalendar)} 
            icon="calendar-edit"
            style={styles.calendarBtn}
          >
            {showCalendar ? "Close Calendar" : "Pick Date"}
          </Button>
        )}
      </View>

      {showCalendar && filterMode !== 'all' && (
        <Card style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            theme={{
                selectedDayBackgroundColor: '#6200ee',
                todayTextColor: '#6200ee',
                arrowColor: '#6200ee',
            }}
            markedDates={{ [selectedDate]: { selected: true } }}
          />
        </Card>
      )}
      
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Transactions</Text>
        <Text style={styles.orderCount}>Total {totalOrdersInDB} orders found</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && orders.length === 0 ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={{marginTop: 10, color: '#666'}}>Syncing Data...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={renderHeader}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Surface style={styles.orderItem} elevation={1}>
              <List.Item
                title={`${item.first_name || 'Customer'} ${item.last_name || ''}`}
                titleStyle={styles.orderTitle}
                description={`ID: #${item.id.toString().slice(-6).toUpperCase()}`}
                descriptionStyle={styles.orderDesc}
                left={() => (
                    <Avatar.Icon size={44} icon="cart-check" backgroundColor="#f0eaff" color="#6200ee" />
                )}
                right={() => (
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>Rs {Number(item.total || 0).toLocaleString()}</Text>
                    <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                )}
              />
            </Surface>
          )}
          ListFooterComponent={() => (
            loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#6200ee" /> : 
            (isListEnd && orders.length > 0 ? <Text style={styles.endText}>End of results</Text> : null)
          )}
          ListEmptyComponent={!loading && <Text style={styles.noData}>Is period mein koi orders nahi hain.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfbff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  headerContainer: { padding: 16 },
  mainStatsCard: { padding: 24, backgroundColor: '#6200ee', borderRadius: 24, marginBottom: 20 },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  revenueAmount: { color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: 10 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 10 },
  statsFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  filterInfo: { color: '#fff', fontSize: 11, opacity: 0.9 },
  totalDbCount: { color: '#fff', fontSize: 11, fontWeight: '700' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 5 },
  liveText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  controlsSection: { marginBottom: 15 },
  segment: { marginBottom: 10, backgroundColor: '#fff' },
  calendarBtn: { borderRadius: 10 },
  calendarCard: { marginBottom: 15, borderRadius: 15, overflow: 'hidden' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
  listTitle: { fontSize: 17, fontWeight: '700' },
  orderCount: { fontSize: 11, color: '#666' },
  orderItem: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f3f3f3' },
  orderTitle: { fontWeight: '700', fontSize: 15 },
  orderDesc: { color: '#888', fontSize: 12 },
  priceContainer: { justifyContent: 'center', alignItems: 'flex-end' },
  priceText: { fontWeight: '800', color: '#2e7d32', fontSize: 15 },
  dateText: { color: '#aaa', fontSize: 10, marginTop: 2 },
  noData: { textAlign: 'center', marginTop: 50, color: '#999' },
  endText: { textAlign: 'center', color: '#ccc', marginVertical: 20, fontSize: 12 },
});

export default AdminSalesScreen;