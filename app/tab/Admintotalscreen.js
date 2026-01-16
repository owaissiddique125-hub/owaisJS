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
  
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0); 
  const [totalOrdersInDB, setTotalOrdersInDB] = useState(0); // Future-proof: Total count from DB
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isListEnd, setIsListEnd] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchOrders = async (pageNumber, shouldRefresh = false) => {
    if (pageNumber === 1 && !refreshing) setLoading(true);
    if (pageNumber > 1) setLoadingMore(true);

    try {
      const token = await getToken();
      const dateParts = selectedDate.split('-');
      const year = dateParts[0];
      const month = dateParts[1];
      
      let queryParams = { 
        page: pageNumber, 
        limit: 15 
      };

      // Backend requirements ke mutabiq filters
      if (filterMode === 'year') {
        queryParams.year = year;
      } else if (filterMode === 'month') {
        queryParams.year = year;
        queryParams.month = month;
      }

      const response = await axios.get(`${API_URL}/api/orders`, {
        params: queryParams,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Stats update
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
      console.error("Sales Fetch Error:", error);
      Alert.alert("Error", "Could not fetch sales data. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Filter change hone par sab refresh karein
  useEffect(() => {
    setOrders([]); 
    setTotalRevenue(0);
    setTotalOrdersInDB(0);
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
               {filterMode === 'all' ? "All-Time Records" : `Filter: ${selectedDate}`}
            </Text>
            <Text style={styles.totalDbCount}>
                Total: {totalOrdersInDB}
            </Text>
        </View>
      </Surface>

      <View style={styles.controlsSection}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'all', label: 'All', icon: 'infinity' },
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
            {showCalendar ? "Hide Calendar" : "Pick Date"}
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
        <Text style={styles.orderCount}>Showing {orders.length} of {totalOrdersInDB}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && orders.length === 0 ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={{marginTop: 10, color: '#666'}}>Fetching Sales Data...</Text>
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
                description={`Order #${item.id.toString().slice(-6).toUpperCase()} • ${item.status || 'Paid'}`}
                descriptionStyle={styles.orderDesc}
                left={() => (
                    <Avatar.Icon 
                        size={44} 
                        icon="cash-check" 
                        backgroundColor="#f0eaff" 
                        color="#6200ee" 
                    />
                )}
                right={() => (
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                      Rs {Number(item.total || 0).toLocaleString()}
                    </Text>
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
            (isListEnd && orders.length > 0 ? <Text style={styles.endText}>All transactions loaded</Text> : null)
          )}
          ListEmptyComponent={!loading && (
            <View style={styles.center}>
                <Avatar.Icon size={80} icon="database-off" backgroundColor="transparent" color="#ccc" />
                <Text style={styles.noData}>No orders found for this period.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfbff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { paddingBottom: 40 },
  headerContainer: { padding: 16 },
  mainStatsCard: { padding: 24, backgroundColor: '#6200ee', borderRadius: 24, marginBottom: 20 },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  revenueAmount: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 10 },
  statsFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  filterInfo: { color: '#fff', fontSize: 12, opacity: 0.9 },
  totalDbCount: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 6 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  controlsSection: { marginBottom: 16 },
  segment: { marginBottom: 12, backgroundColor: '#fff' },
  calendarBtn: { borderRadius: 12 },
  calendarCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  orderCount: { fontSize: 12, color: '#666', fontWeight: '600' },
  orderItem: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  orderTitle: { fontWeight: '700', fontSize: 16, color: '#1a1a1a' },
  orderDesc: { color: '#777', fontSize: 13, marginTop: 2 },
  priceContainer: { justifyContent: 'center', alignItems: 'flex-end' },
  priceText: { fontWeight: '800', color: '#2e7d32', fontSize: 16 },
  dateText: { color: '#999', fontSize: 11, marginTop: 4 },
  noData: { textAlign: 'center', marginTop: 10, color: '#999', fontSize: 14 },
  endText: { textAlign: 'center', color: '#bbb', marginVertical: 30, fontSize: 13, fontWeight: '500' },
});

export default AdminSalesScreen;