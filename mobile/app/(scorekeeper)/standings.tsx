import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { getCachedStandings, saveCachedStandings } from '../../services/database';

export default function StandingsScreen() {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchStandings = async () => {
    try {
      const net = await NetInfo.fetch();
      setIsOnline(!!net.isConnected);

      if (!net.isConnected) {
        // Offline: Load from local SQLite cache
        const localData = await getCachedStandings('overall');
        if (localData) {
          setStandings(localData.data);
          setLastUpdated(localData.updatedAt);
        }
        return;
      }

      // Online: Fetch from API and update SQLite cache
      const response = await api.get('/standings/log');
      const data = Array.isArray(response.data) ? response.data : [];
      
      setStandings(data);
      await saveCachedStandings('overall', data);
      
      // Get updated timestamp
      const localData = await getCachedStandings('overall');
      if (localData) {
        setLastUpdated(localData.updatedAt);
      }
    } catch (err) {
      console.error('[Standings Fetch Error]:', err);
      // Fallback
      const localData = await getCachedStandings('overall');
      if (localData) {
        setStandings(localData.data);
        setLastUpdated(localData.updatedAt);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStandings();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStandings();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading tournament leaderboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Network banner */}
      <View style={[styles.networkBanner, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]}>
        <Text style={styles.networkText}>
          {isOnline ? '🟢 Live Standings' : '⚠️ Offline Mode (Showing cached rankings)'}
        </Text>
      </View>

      {/* Standings List */}
      <FlatList
        data={standings}
        keyExtractor={(item, index) => item.code || String(index)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No standings data available yet.</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          const rank = index + 1;
          let rankColor = '#94a3b8'; // Default grey
          if (rank === 1) rankColor = '#fbbf24'; // Gold
          if (rank === 2) rankColor = '#cbd5e1'; // Silver
          if (rank === 3) rankColor = '#d97706'; // Bronze

          return (
            <View style={styles.teamCard}>
              {/* Rank Badge */}
              <View style={[styles.rankBadge, { backgroundColor: rankColor + '20' }]}>
                <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
              </View>

              {/* Team Info */}
              <View style={styles.teamInfo}>
                <View style={styles.nameRow}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color || '#2563eb' }]} />
                  <Text style={styles.teamName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.teamCode}>{item.code}</Text>
              </View>

              {/* Medal counts */}
              <View style={styles.medalsRow}>
                <View style={styles.medalCount}>
                  <Text style={styles.medalIcon}>🥇</Text>
                  <Text style={styles.medalNum}>{item.gold || 0}</Text>
                </View>
                <View style={styles.medalCount}>
                  <Text style={styles.medalIcon}>🥈</Text>
                  <Text style={styles.medalNum}>{item.silver || 0}</Text>
                </View>
                <View style={styles.medalCount}>
                  <Text style={styles.medalIcon}>🥉</Text>
                  <Text style={styles.medalNum}>{item.bronze || 0}</Text>
                </View>
              </View>

              {/* Points */}
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{item.total || 0}</Text>
                <Text style={styles.pointsLabel}>PTS</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Cache footer */}
      {lastUpdated && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last refreshed: {lastUpdated.replace('T', ' ').substring(0, 19)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  networkBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  networkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  teamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '900',
  },
  teamInfo: {
    flex: 2,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  teamCode: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '800',
    marginTop: 2,
  },
  medalsRow: {
    flexDirection: 'row',
    flex: 2,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 2,
  },
  medalCount: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalIcon: {
    fontSize: 14,
  },
  medalNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    width: 52,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10b981',
  },
  pointsLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 1,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  footerText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
