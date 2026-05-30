import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const BRAND_ACCENT = "#6366F1";
const BRAND_ACCENT_LIGHT = "#EEF2FF";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  headerStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: BRAND_ACCENT_LIGHT,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_ACCENT,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  brandName: {
    fontSize: 16,
    fontWeight: "bold",
    color: BRAND_ACCENT,
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  headerSubtext: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    color: "#111827",
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricCard: {
    padding: 15,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    width: "30%",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  insightRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    width: "35%",
  },
  insightValue: {
    fontSize: 10,
    color: BRAND_ACCENT,
    fontWeight: "bold",
    width: "25%",
  },
  insightContext: {
    fontSize: 9,
    color: "#9CA3AF",
    width: "40%",
  },
  insightsContainer: {
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tweetRow: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
  },
  tweetContent: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  tweetMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  tweetStat: {
    fontSize: 9,
    color: "#6B7280",
  },
  footerBranding: {
    position: "absolute",
    bottom: 30,
    left: 30,
    fontSize: 9,
    color: "#9CA3AF",
  },
  footerPageNumber: {
    position: "absolute",
    bottom: 30,
    right: 30,
    fontSize: 9,
    color: "#9CA3AF",
  },
});

export interface AnalyticsPdfData {
  range: string;
  totals: {
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    linkClicks: number;
  };
  topTweets: Array<{
    content: string;
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    fetchedAt: Date;
  }>;
  insights?: Array<{
    label: string;
    value: string;
    context?: string;
  }>;
  userName?: string;
  accountHandle?: string;
}

export const AnalyticsPdfDocument = ({
  data,
  userLocale = "en",
}: {
  data: AnalyticsPdfData;
  userLocale?: string;
}) => {
  const today = new Date().toLocaleDateString(userLocale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Background Strip */}
        <View style={styles.headerStrip} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>AstraPost</Text>
            <Text style={styles.reportTitle}>Analytics Report</Text>
            <Text style={styles.headerSubtext}>Performance Report ({data.range})</Text>
          </View>
          <View style={styles.headerRight}>
            {data.userName != null ? (
              <Text style={styles.headerSubtext}>{data.userName}</Text>
            ) : null}
            {data.accountHandle != null ? (
              <Text style={styles.headerSubtext}>{data.accountHandle}</Text>
            ) : null}
            <Text style={styles.headerSubtext}>{today}</Text>
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {data.totals.impressions.toLocaleString(userLocale)}
            </Text>
            <Text style={styles.metricLabel}>Total Impressions</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(data.totals.likes + data.totals.retweets + data.totals.replies).toLocaleString(
                userLocale
              )}
            </Text>
            <Text style={styles.metricLabel}>Total Engagements</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {data.totals.linkClicks.toLocaleString(userLocale)}
            </Text>
            <Text style={styles.metricLabel}>Link Clicks</Text>
          </View>
        </View>

        {/* Secondary Metrics */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: 20,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text style={styles.tweetStat}>
            Likes: {data.totals.likes.toLocaleString(userLocale)}
          </Text>
          <Text style={styles.tweetStat}>
            Retweets: {data.totals.retweets.toLocaleString(userLocale)}
          </Text>
          <Text style={styles.tweetStat}>
            Replies: {data.totals.replies.toLocaleString(userLocale)}
          </Text>
        </View>

        {/* Key Insights */}
        {data.insights != null && data.insights.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            <View style={styles.insightsContainer}>
              {data.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <Text style={styles.insightLabel}>{insight.label}</Text>
                  <Text style={styles.insightValue}>{insight.value}</Text>
                  <Text style={styles.insightContext}>{insight.context ?? ""}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Top Tweets */}
        <Text style={styles.sectionTitle}>Top Performing Tweets</Text>

        {data.topTweets.map((tweet, i) => (
          <View key={i} style={styles.tweetRow}>
            <Text style={styles.tweetContent}>{tweet.content}</Text>
            <View style={styles.tweetMeta}>
              <Text style={styles.tweetStat}>
                👁 {tweet.impressions.toLocaleString(userLocale)}
              </Text>
              <Text style={styles.tweetStat}>❤️ {tweet.likes.toLocaleString(userLocale)}</Text>
              <Text style={styles.tweetStat}>🔁 {tweet.retweets.toLocaleString(userLocale)}</Text>
              <Text style={styles.tweetStat}>
                📅 {new Date(tweet.fetchedAt).toLocaleDateString(userLocale)}
              </Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footerBranding} fixed>
          AstraPost
        </Text>
        <Text
          style={styles.footerPageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};
