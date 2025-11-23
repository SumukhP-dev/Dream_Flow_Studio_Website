import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { StatsCard } from "@/components/analytics/StatsCard";
import { analyticsApi, AnalyticsData } from "@/lib/api/analytics";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { HelpTooltip } from "@/components/help/HelpTooltip";

type DateRangePreset = "7d" | "30d" | "90d" | "custom" | "all";

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange === "custom") {
        if (customStartDate && customEndDate) {
          startDate = startOfDay(customStartDate).toISOString();
          endDate = endOfDay(customEndDate).toISOString();
        }
      } else if (dateRange !== "all") {
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        startDate = startOfDay(subDays(new Date(), days)).toISOString();
        endDate = endOfDay(new Date()).toISOString();
      }

      const data = await analyticsApi.getAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, customStartDate, customEndDate]);

  if (loading && !analytics) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary.purple} />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No analytics data available</Text>
      </View>
    );
  }

  const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "all", label: "All Time" },
  ];

  // Prepare chart data
  const usageChartData = analytics.usageByDate.map((item) => ({
    x: format(new Date(item.date), "MMM dd"),
    y: item.count,
  }));

  const themeChartData = analytics.popularThemes.slice(0, 5).map((item) => ({
    name: item.theme,
    value: item.count,
    color: Colors.primary.purple,
  }));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadAnalytics}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={Colors.primary.purple}
          />
        </TouchableOpacity>
      </View>

      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <View style={styles.dateRangeHeader}>
          <Text style={styles.dateRangeLabel}>Date Range</Text>
          <HelpTooltip
            text="Select a time period to view analytics. Choose from preset ranges (7 days, 30 days, 90 days) or view all time. Analytics are filtered based on the selected range."
            title="Date Range"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dateRangeButton,
                dateRange === option.value && styles.dateRangeButtonActive,
              ]}
              onPress={() => setDateRange(option.value)}
            >
              <Text
                style={[
                  styles.dateRangeButtonText,
                  dateRange === option.value && styles.dateRangeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatsCard
          title="Total Stories"
          value={analytics.totalStories}
          icon="book-open-variant"
          color={Colors.primary.purple}
        />
        <StatsCard
          title="With Media"
          value={analytics.storiesWithMedia}
          icon="multimedia"
          color={Colors.secondary.cyan}
          subtitle={`${analytics.totalStories > 0 ? Math.round((analytics.storiesWithMedia / analytics.totalStories) * 100) : 0}% of stories`}
        />
        <StatsCard
          title="Avg Length"
          value={`${analytics.averageStoryLength} words`}
          icon="text"
          color={Colors.primary.blue}
        />
        <StatsCard
          title="Last 7 Days"
          value={analytics.recentActivity.last7Days}
          icon="calendar-week"
          color={Colors.status.success}
        />
      </View>

      {/* Media Generation Stats */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Media Generation</Text>
          <HelpTooltip
            text="Track the success rate of video and audio generation. Shows how many media files were successfully generated out of total attempts. Higher success rates indicate better system performance."
            title="Media Generation Stats"
          />
        </View>
        <View style={styles.mediaStats}>
          <View style={styles.mediaStatCard}>
            <Text style={styles.mediaStatLabel}>Video Success Rate</Text>
            <Text style={styles.mediaStatValue}>
              {analytics.mediaGeneration.videoSuccessRate}%
            </Text>
            <Text style={styles.mediaStatSubtext}>
              {analytics.mediaGeneration.successfulVideos} / {analytics.mediaGeneration.totalVideoAttempts}
            </Text>
          </View>
          <View style={styles.mediaStatCard}>
            <Text style={styles.mediaStatLabel}>Audio Success Rate</Text>
            <Text style={styles.mediaStatValue}>
              {analytics.mediaGeneration.audioSuccessRate}%
            </Text>
            <Text style={styles.mediaStatSubtext}>
              {analytics.mediaGeneration.successfulAudios} / {analytics.mediaGeneration.totalAudioAttempts}
            </Text>
          </View>
        </View>
      </View>

      {/* Popular Themes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Themes</Text>
        <View style={styles.themeList}>
          {analytics.popularThemes.slice(0, 5).map((item, index) => (
            <View key={item.theme} style={styles.themeItem}>
              <View style={styles.themeRank}>
                <Text style={styles.themeRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.themeInfo}>
                <Text style={styles.themeName}>{item.theme}</Text>
                <View style={styles.themeBarContainer}>
                  <View
                    style={[
                      styles.themeBar,
                      {
                        width: `${(item.count / analytics.totalStories) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.themeCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Usage Over Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stories Created Over Time</Text>
        {analytics.usageByDate.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>No data for selected period</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            {usageChartData.map((item, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(item.y / Math.max(...usageChartData.map(d => d.y))) * 100}%`,
                      minHeight: 4,
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>{item.x}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Export Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Statistics</Text>
        <View style={styles.exportStats}>
          <View style={styles.exportStatItem}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={24}
              color={Colors.status.error}
            />
            <Text style={styles.exportStatValue}>
              {analytics.exportStats.exportsByFormat.pdf}
            </Text>
            <Text style={styles.exportStatLabel}>PDF</Text>
          </View>
          <View style={styles.exportStatItem}>
            <MaterialCommunityIcons
              name="language-markdown"
              size={24}
              color={Colors.primary.blue}
            />
            <Text style={styles.exportStatValue}>
              {analytics.exportStats.exportsByFormat.markdown}
            </Text>
            <Text style={styles.exportStatLabel}>Markdown</Text>
          </View>
          <View style={styles.exportStatItem}>
            <MaterialCommunityIcons
              name="code-json"
              size={24}
              color={Colors.primary.purple}
            />
            <Text style={styles.exportStatValue}>
              {analytics.exportStats.exportsByFormat.json}
            </Text>
            <Text style={styles.exportStatLabel}>JSON</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  dateRangeContainer: {
    padding: 16,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dateRangeButtonActive: {
    backgroundColor: Colors.primary.purple + "20",
    borderColor: Colors.primary.purple,
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: "500",
  },
  dateRangeButtonTextActive: {
    color: Colors.primary.purple,
    fontWeight: "600",
  },
  statsGrid: {
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.background.surface,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  dateRangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.secondary,
    marginRight: 8,
  },
  mediaStats: {
    flexDirection: "row",
    gap: 12,
  },
  mediaStatCard: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    alignItems: "center",
  },
  mediaStatLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mediaStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary.purple,
    marginBottom: 4,
  },
  mediaStatSubtext: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  themeList: {
    gap: 12,
  },
  themeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
  },
  themeRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.purple + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  themeRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary.purple,
  },
  themeInfo: {
    flex: 1,
    marginRight: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  themeBarContainer: {
    height: 4,
    backgroundColor: Colors.background.glass,
    borderRadius: 2,
    overflow: "hidden",
  },
  themeBar: {
    height: "100%",
    backgroundColor: Colors.primary.purple,
    borderRadius: 2,
  },
  themeCount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.secondary,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 200,
    gap: 4,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: "center",
  },
  chartBar: {
    width: "100%",
    backgroundColor: Colors.primary.purple,
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    transform: [{ rotate: "-45deg" }],
  },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChartText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  exportStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  exportStatItem: {
    alignItems: "center",
  },
  exportStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  exportStatLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 100,
  },
});
