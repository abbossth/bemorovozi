import { Document, Page, View, Text, Image, Svg, Path, Polyline, Circle, Rect, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  card: {
    width: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E4E7EB",
    borderStyle: "solid",
    padding: 36,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  wordmark: { fontSize: 18, fontWeight: 800, color: "#16181D", marginTop: 4 },
  qr: { width: 200, height: 200, marginTop: 10, marginBottom: 10 },
  deptName: { fontSize: 17, fontWeight: 800, color: "#16181D", textAlign: "center" },
  tagline: { fontSize: 13, fontWeight: 700, color: "#0F6E5C" },
  hint: { fontSize: 11, color: "#9CA3AF" },
  domain: { fontSize: 10, color: "#C9D2CE", marginTop: 6 },
});

function LogoMarkPdf() {
  return (
    <Svg viewBox="0 0 512 512" width={40} height={40}>
      <Rect width={512} height={512} rx={112} fill="#0F6E5C" />
      <Path
        d="M128 152h256a40 40 0 0 1 40 40v128a40 40 0 0 1-40 40h-140l-56 52a8 8 0 0 1-13.5-6.5v-45.5h-46.5a40 40 0 0 1-40-40v-128a40 40 0 0 1 40-40z"
        fill="#FFFFFF"
      />
      <Polyline
        points="150,272 198,272 218,228 246,316 268,244 284,272 362,272"
        fill="none"
        stroke="#0F6E5C"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={362} cy={272} r={15} fill="#E5534B" />
    </Svg>
  );
}

export function QrCardDocument({ departmentName, qrDataUrl }: { departmentName: string; qrDataUrl: string }) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.card}>
          <LogoMarkPdf />
          <Text style={styles.wordmark}>BemorOvozi</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is a PDF primitive, not an HTML img */}
          <Image src={qrDataUrl} style={styles.qr} />
          <Text style={styles.deptName}>{departmentName}</Text>
          <Text style={styles.tagline}>Takliflar va shikoyatlar uchun</Text>
          <Text style={styles.hint}>Telefon kamerasi bilan skanerlang</Text>
          <Text style={styles.domain}>bemorovozi.uz</Text>
        </View>
      </Page>
    </Document>
  );
}
