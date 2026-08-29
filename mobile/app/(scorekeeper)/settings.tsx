import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  getDatabase,
  cacheEventData,
  initDatabase,
} from '../../services/database';

export default function SettingsScreen() {
  const { user, orgSlug, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState({
    fixtures: 0,
    teams: 0,
    pending: 0,
    history: 0,
  });

  const loadDbStats = async () => {
    try {
      const db = await getDatabase();
      
      const fixCount: any = await db.getFirstAsync('SELECT count(*) as c FROM fixtures');
      const teamsCount: any = await db.getFirstAsync('SELECT count(*) as c FROM teams');
      const pendingCount: any = await db.getFirstAsync('SELECT count(*) as c FROM sync_queue WHERE status = ?', ['pending_sync']);
      const historyCount: any = await db.getFirstAsync('SELECT count(*) as c FROM sync_queue WHERE status <> ?', ['pending_sync']);

      setDbStats({
        fixtures: fixCount?.c || 0,
        teams: teamsCount?.c || 0,
        pending: pendingCount?.c || 0,
        history: historyCount?.c || 0,
      });
    } catch (err) {
      console.error('Failed to load database stats:', err);
    }
  };

  useEffect(() => {
    loadDbStats();
  }, []);

  const handleReDownload = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Offline Mode', 'You must be online to synchronize data with the server.');
      return;
    }

    setLoading(true);
    try {
      console.log('[Diagnostics] Forcing full data refresh from server...');
      const [fixRes, teamsRes, sportsRes] = await Promise.all([
        api.get('/fixtures'),
        api.get('/teams'),
        api.get('/sports'),
      ]);

      await cacheEventData(fixRes.data, teamsRes.data, sportsRes.data);
      await loadDbStats();
      Alert.alert('Success', 'Database metadata successfully refreshed from server!');
    } catch (err: any) {
      Alert.alert('Refresh Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Confirm Clear',
      'Are you sure you want to clear all synced items from local history? Un-synchronized items will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync('DELETE FROM sync_queue WHERE status <> ?', ['pending_sync']);
              await loadDbStats();
              Alert.alert('Success', 'Local sync history cleared.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of this scorekeeper session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile summary card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>👤 Authenticated Session</Text>
        
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Name:</Text>
          <Text style={styles.profileValue}>{user?.name || 'N/A'}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Email:</Text>
          <Text style={styles.profileValue}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Role:</Text>
          <Text style={[styles.profileValue, styles.roleBadge]}>
            {(user?.role || 'viewer').toUpperCase()}
          </Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Workspace:</Text>
          <Text style={styles.profileValue}>{orgSlug || 'demo-tournament'}</Text>
        </View>
      </View>

      {/* Database stats card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>📊 SQLite Local Database Stats</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Fixtures Cached:</Text>
          <Text style={styles.statValue}>{dbStats.fixtures}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Teams Cached:</Text>
          <Text style={styles.statValue}>{dbStats.teams}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Queue Pending Sync:</Text>
          <Text style={[styles.statValue, dbStats.pending > 0 && styles.textWarning]}>
            {dbStats.pending}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Sync Log History:</Text>
          <Text style={styles.statValue}>{dbStats.history}</Text>
        </View>
      </View>

      {/* Actions card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🛠️ Database Maintenance</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, loading && styles.disabledButton]}
          onPress={handleReDownload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>🔄 Re-download Tournament Data</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleClearHistory}>
          <Text style={styles.actionButtonText}>🧹 Clear Synced History</Text>
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out of Console</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderColor: '#334155',
    paddingBottom: 10,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#33415550',
  },
  profileLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  profileValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  roleBadge: {
    color: '#10b981',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#33415550',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  textWarning: {
    color: '#f59e0b',
  },
  actionButton: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f640',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#33415540',
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#3b82f6',
    fontWeight: '800',
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 14,
  },
});
