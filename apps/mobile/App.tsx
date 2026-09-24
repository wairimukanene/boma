import {
  type Bill,
  createBomaSupabaseClient,
  demoBills,
  formatMoney,
  getBillTotal,
  hasSupabaseConfig
} from "@boma/shared";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  hasSupabaseConfig(supabaseUrl, supabaseAnonKey) && supabaseUrl && supabaseAnonKey
    ? createBomaSupabaseClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function App() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const visibleBills = bills.length > 0 ? bills : demoBills;
  const total = useMemo(() => getBillTotal(visibleBills), [visibleBills]);

  useEffect(() => {
    let isMounted = true;

    async function loadBills() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("bills")
        .select("*")
        .order("due_date", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
      } else {
        setBills(
          (data ?? []).map((bill) => ({
            ...bill,
            amount: Number(bill.amount)
          })) as Bill[]
        );
      }

      setIsLoading(false);
    }

    loadBills();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>Boma Bills</Text>
            <Text style={styles.title}>Household payments, one view.</Text>
            <Text style={styles.subtitle}>
              Track utilities, school costs, internet, rent, gas, and token
              top-ups from the same Supabase backend as web.
            </Text>

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Upcoming total</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            </View>

            {!supabase ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Showing demo data. Add Expo Supabase environment variables to
                  load live bills.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isLoading ? <Text style={styles.loading}>Loading bills...</Text> : null}
          </View>
        }
        contentContainerStyle={styles.content}
        data={visibleBills}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.billCard}>
            <View>
              <Text style={styles.dueDate}>Due {item.due_date}</Text>
              <Text style={styles.billName}>{item.name}</Text>
              <Text style={styles.provider}>
                {[item.provider, item.recurrence].filter(Boolean).join(" • ")}
              </Text>
            </View>
            <View style={styles.billFooter}>
              <Text style={styles.status}>{item.status}</Text>
              <Text style={styles.amount}>
                {formatMoney(Number(item.amount), item.currency_code)}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f2ea"
  },
  content: {
    padding: 20,
    paddingBottom: 48
  },
  header: {
    gap: 16,
    marginBottom: 8
  },
  kicker: {
    color: "#d96523",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    color: "#1d1a16",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1
  },
  subtitle: {
    color: "#71675c",
    fontSize: 16,
    lineHeight: 24
  },
  totalCard: {
    backgroundColor: "#fffaf2",
    borderColor: "#eadbca",
    borderRadius: 28,
    borderWidth: 1,
    padding: 20
  },
  totalLabel: {
    color: "#71675c",
    fontSize: 14
  },
  totalValue: {
    color: "#1d1a16",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4
  },
  notice: {
    backgroundColor: "#fff4d6",
    borderRadius: 20,
    padding: 14
  },
  noticeText: {
    color: "#7c4a03",
    lineHeight: 20
  },
  error: {
    backgroundColor: "#ffe4e6",
    borderRadius: 20,
    padding: 14
  },
  errorText: {
    color: "#9f1239",
    lineHeight: 20
  },
  loading: {
    color: "#71675c"
  },
  billCard: {
    backgroundColor: "#fffaf2",
    borderColor: "#eadbca",
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    marginTop: 14,
    padding: 18
  },
  dueDate: {
    color: "#71675c",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  billName: {
    color: "#1d1a16",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6
  },
  provider: {
    color: "#71675c",
    fontSize: 15,
    marginTop: 4
  },
  billFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  status: {
    backgroundColor: "#f7f2ea",
    borderRadius: 999,
    color: "#994617",
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: "capitalize"
  },
  amount: {
    color: "#1d1a16",
    fontSize: 22,
    fontWeight: "800"
  }
});
