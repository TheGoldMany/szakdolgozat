import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register a font that supports Hungarian characters
Font.registerHyphenationCallback(word => [word]);

const S = StyleSheet.create({
  page:          { padding: 50, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a" },
  header:        { marginBottom: 32, alignItems: "center" },
  title:         { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  subtitle:      { fontSize: 10, color: "#666", letterSpacing: 1 },
  sectionTitle:  { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  section:       { marginBottom: 20 },
  row:           { flexDirection: "row", marginBottom: 4 },
  label:         { width: 130, color: "#666" },
  value:         { flex: 1, fontFamily: "Helvetica-Bold" },
  clauseNum:     { width: 22, fontFamily: "Helvetica-Bold", color: "#444" },
  clauseText:    { flex: 1, lineHeight: 1.6, color: "#333" },
  signRow:       { flexDirection: "row", gap: 40, marginTop: 10 },
  signBox:       { flex: 1, borderTopWidth: 1, borderTopColor: "#999", paddingTop: 6 },
  signLabel:     { fontSize: 9, color: "#888" },
  footer:        { position: "absolute", bottom: 30, left: 50, right: 50, textAlign: "center", fontSize: 8, color: "#aaa" },
  divider:       { height: 1, backgroundColor: "#e8e8e8", marginBottom: 20 },
  badge:         { backgroundColor: "#e8f5e9", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 16 },
  badgeText:     { color: "#2e7d32", fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 0.5 },
});

const ANIMAL_TYPE: Record<string, string> = {
  DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
};

export interface ContractData {
  contractDate: string;
  shelter: {
    name:    string;
    address: string;
    city:    string;
    phone:   string | null;
    email:   string | null;
  };
  animal: {
    name:          string;
    type:          string;
    breed:         string | null;
    isMicrochipped: boolean;
    isVaccinated:   boolean;
    isNeutered:     boolean;
  };
  adopter: {
    name:    string | null;
    email:   string;
    phone:   string | null;
    address: string | null;
    city:    string | null;
  };
  applicationId: string;
}

export function AdoptionContractPDF({ data }: { data: ContractData }) {
  const animalType = ANIMAL_TYPE[data.animal.type] ?? data.animal.type;
  const traits = [
    data.animal.isVaccinated   && "oltott",
    data.animal.isNeutered     && "ivartalanított",
    data.animal.isMicrochipped && "mikrochippel ellátott",
  ].filter(Boolean).join(", ");

  return (
    <Document
      title={`Örökbefogadási szerződés – ${data.animal.name}`}
      author={data.shelter.name}
    >
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>Örökbefogadási Szerződés</Text>
          <Text style={S.subtitle}>ÁllatiMenhelyek Platform</Text>
        </View>

        <View style={S.badge}>
          <Text style={S.badgeText}>ELFOGADOTT KÉRELEM • {data.applicationId.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Parties */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>I. Szerződő felek</Text>

          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#444" }}>Átadó fél (menhely):</Text>
          <View style={S.row}><Text style={S.label}>Menhely neve:</Text><Text style={S.value}>{data.shelter.name}</Text></View>
          <View style={S.row}><Text style={S.label}>Cím:</Text><Text style={S.value}>{data.shelter.city}, {data.shelter.address}</Text></View>
          {data.shelter.phone && <View style={S.row}><Text style={S.label}>Telefon:</Text><Text style={S.value}>{data.shelter.phone}</Text></View>}
          {data.shelter.email && <View style={S.row}><Text style={S.label}>E-mail:</Text><Text style={S.value}>{data.shelter.email}</Text></View>}

          <View style={{ height: 12 }} />

          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#444" }}>Átvevő fél (örökbefogadó):</Text>
          <View style={S.row}><Text style={S.label}>Név:</Text><Text style={S.value}>{data.adopter.name ?? "–"}</Text></View>
          <View style={S.row}><Text style={S.label}>E-mail:</Text><Text style={S.value}>{data.adopter.email}</Text></View>
          {data.adopter.phone   && <View style={S.row}><Text style={S.label}>Telefon:</Text><Text style={S.value}>{data.adopter.phone}</Text></View>}
          {data.adopter.city    && <View style={S.row}><Text style={S.label}>Lakcím:</Text><Text style={S.value}>{data.adopter.city}{data.adopter.address ? `, ${data.adopter.address}` : ""}</Text></View>}
        </View>

        {/* Animal */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>II. Az örökbe fogadott állat</Text>
          <View style={S.row}><Text style={S.label}>Neve:</Text><Text style={S.value}>{data.animal.name}</Text></View>
          <View style={S.row}><Text style={S.label}>Faj:</Text><Text style={S.value}>{animalType}</Text></View>
          {data.animal.breed && <View style={S.row}><Text style={S.label}>Fajta:</Text><Text style={S.value}>{data.animal.breed}</Text></View>}
          {traits && <View style={S.row}><Text style={S.label}>Állapot:</Text><Text style={S.value}>{traits}</Text></View>}
        </View>

        {/* Terms */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>III. Szerződési feltételek</Text>
          {[
            "Az örökbefogadó vállalja, hogy az állatot megfelelő gondozásban, biztonságos, emberséges körülmények között tartja, rendszeres táplálékkal és friss vízzel látja el, és szükség esetén állatorvosi ellátást biztosít számára.",
            "Az örökbefogadó vállalja, hogy az állatot nem adja el, nem ajándékozza el és nem hagyja el, és ha bármilyen okból nem tudja tovább tartani, értesíti a menhelyet és visszaszolgáltatja az állatot.",
            "Az átadó fél szavatolja, hogy az állat az átadás időpontjában egészséges, oltásai naprakészek (amennyiben az erre vonatkozó rovat meg lett jelölve), és nem szenved ismert, bejelenteni elmulasztott betegségben.",
            "A szerződés mindkét fél aláírásával lép hatályba. Az örökbefogadó tudomásul veszi, hogy a menhely jogosult az állat elhelyezési körülményeit utólag ellenőrizni.",
          ].map((clause, i) => (
            <View key={i} style={[S.row, { marginBottom: 8 }]}>
              <Text style={S.clauseNum}>{i + 1}.</Text>
              <Text style={S.clauseText}>{clause}</Text>
            </View>
          ))}
        </View>

        {/* Date & Signatures */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>IV. Aláírások</Text>
          <View style={S.row}>
            <Text style={S.label}>Kelt:</Text>
            <Text style={S.value}>{data.contractDate}</Text>
          </View>

          <View style={[S.signRow, { marginTop: 40 }]}>
            <View style={S.signBox}>
              <Text style={S.signLabel}>Átadó fél (menhely) aláírása</Text>
            </View>
            <View style={S.signBox}>
              <Text style={S.signLabel}>Átvevő fél (örökbefogadó) aláírása</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={S.footer}>
          Ez a dokumentum az ÁllatiMenhelyek platformon keresztül lett generálva. • Kérelem azonosító: {data.applicationId}
        </Text>
      </Page>
    </Document>
  );
}
