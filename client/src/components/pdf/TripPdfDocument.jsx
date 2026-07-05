import {
    Document,
    Page,
    Text,
    View,
    Link,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import robotoRegular from "@fontsource/roboto/files/roboto-latin-ext-400-normal.woff?url";
import robotoBold from "@fontsource/roboto/files/roboto-latin-ext-700-normal.woff?url";

Font.register({
    family: "Roboto",
    fonts: [
        { src: robotoRegular, fontWeight: 400 },
        { src: robotoBold, fontWeight: 700 },
    ],
});

// ── Stiluri PDF ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    page: {
        fontFamily: "Roboto",
        fontWeight: 400,
        fontSize: 10,
        color: "#1a2535",
        paddingTop: 48,
        paddingBottom: 48,
        paddingHorizontal: 48,
        backgroundColor: "#ffffff",
    },

    // Header
    header: {
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: "#2a7c6f",
        borderBottomStyle: "solid",
    },
    destination: {
        fontSize: 26,
        fontWeight: 700,
        color: "#2a7c6f",
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    metaChip: {
        fontSize: 9,
        color: "#5a6a7a",
        backgroundColor: "#f0f4f3",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },

    // Hotel
    hotelBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f7f9f8",
        borderRadius: 6,
        padding: 10,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: "#2a7c6f",
        borderLeftStyle: "solid",
    },
    hotelLabel: {
        fontSize: 9,
        color: "#5a6a7a",
        fontWeight: 700,
        marginRight: 6,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    hotelName: {
        fontSize: 10,
        color: "#1a2535",
    },

    // Sectiune zi
    daySection: {
        marginBottom: 20,
    },
    dayTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: "#1a2535",
        backgroundColor: "#eef4f3",
        padding: 8,
        borderRadius: 5,
        marginBottom: 6,
    },

    // Tabel obiective
    table: {
        borderWidth: 1,
        borderColor: "#dde5e3",
        borderStyle: "solid",
        borderRadius: 5,
        overflow: "hidden",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#2a7c6f",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 700,
        color: "#ffffff",
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: "#eef0ef",
        borderTopStyle: "solid",
    },
    tableRowAlt: {
        backgroundColor: "#f9fbfa",
    },

    colNr:      { width: "5%" },
    colTitle:   { width: "28%" },
    colTime:    { width: "10%" },
    colAddress: { width: "32%" },
    colMaps:    { width: "25%" },

    cellText: {
        fontSize: 9,
        color: "#1a2535",
        lineHeight: 1.4,
    },
    cellTextMuted: {
        fontSize: 9,
        color: "#7a8a9a",
    },
    mapsLink: {
        fontSize: 8,
        color: "#2a7c6f",
        textDecoration: "underline",
    },

    // Obiective fara zi
    unassignedSection: {
        marginBottom: 20,
    },

    // Budget
    budgetSection: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1.5,
        borderTopColor: "#2a7c6f",
        borderTopStyle: "solid",
    },
    budgetTitle: {
        fontSize: 13,
        fontWeight: 700,
        color: "#1a2535",
        marginBottom: 12,
    },
    budgetGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 12,
    },
    budgetCard: {
        backgroundColor: "#f0f6f4",
        borderRadius: 6,
        padding: 10,
        minWidth: 120,
        flex: 1,
    },
    budgetCardLabel: {
        fontSize: 8,
        color: "#5a6a7a",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    budgetCardValue: {
        fontSize: 14,
        fontWeight: 700,
        color: "#2a7c6f",
    },
    budgetNote: {
        fontSize: 8,
        color: "#8a9aaa",
    },

    // Footer
    footer: {
        position: "absolute",
        bottom: 24,
        left: 48,
        right: 48,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#dde5e3",
        borderTopStyle: "solid",
        paddingTop: 8,
    },
    footerText: {
        fontSize: 7.5,
        color: "#aab0b8",
    },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const mapsUrl = (lat, lng) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// ── Sub-componente PDF ─────────────────────────────────────────────────────────
function ObjectivesTable({ objectives }) {
    if (!objectives || objectives.length === 0) {
        return (
            <Text style={[S.cellTextMuted, { paddingLeft: 8, paddingBottom: 6 }]}>
                Niciun obiectiv adăugat.
            </Text>
        );
    }

    return (
        <View style={S.table}>
            <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, S.colNr]}>#</Text>
                <Text style={[S.tableHeaderCell, S.colTitle]}>Obiectiv</Text>
                <Text style={[S.tableHeaderCell, S.colTime]}>Oră</Text>
                <Text style={[S.tableHeaderCell, S.colAddress]}>Adresă</Text>
                <Text style={[S.tableHeaderCell, S.colMaps]}>Google Maps</Text>
            </View>

            {objectives.map((obj, idx) => (
                <View
                    key={obj.id_objective}
                    style={[S.tableRow, idx % 2 === 1 ? S.tableRowAlt : null]}
                    wrap={false}
                >
                    <Text style={[S.cellTextMuted, S.colNr]}>{idx + 1}</Text>
                    <Text style={[S.cellText, S.colTitle]}>{obj.title}</Text>
                    <Text style={[S.cellTextMuted, S.colTime]}>
                        {obj.planned_time ? obj.planned_time.slice(0, 5) : "—"}
                    </Text>
                    <Text style={[S.cellText, S.colAddress]}>
                        {obj.address || "—"}
                    </Text>
                    <View style={S.colMaps}>
                        {obj.coord_lat && obj.coord_lng ? (
                            <Link
                                src={mapsUrl(obj.coord_lat, obj.coord_lng)}
                                style={S.mapsLink}
                            >
                                Deschide pe Maps
                            </Link>
                        ) : (
                            <Text style={S.cellTextMuted}>—</Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

// ── Document principal ─────────────────────────────────────────────────────────
export default function TripPdfDocument({ trip, days, unassigned, budgetTotal }) {
    const today = new Date().toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const hasBudget = budgetTotal != null && budgetTotal > 0;

    return (
        <Document
            title={`Itinerar – ${trip.destination_name}`}
            author="TravelPlanner"
        >
            <Page size="A4" style={S.page}>

                {/* ── Header ── */}
                <View style={S.header}>
                    <Text style={S.destination}>{trip.destination_name}</Text>
                    <View style={S.metaRow}>
                        <Text style={S.metaChip}>
                            {trip.number_of_days}{" "}
                            {trip.number_of_days === 1 ? "zi" : "zile"}
                        </Text>
                        {trip.start_date && (
                            <Text style={S.metaChip}>
                                Plecare: {fmt(trip.start_date)}
                            </Text>
                        )}
                        {trip.number_of_people && (
                            <Text style={S.metaChip}>
                                {trip.number_of_people}{" "}
                                {trip.number_of_people === 1 ? "persoană" : "persoane"}
                            </Text>
                        )}
                    </View>
                </View>

                {/* ── Hotel ── */}
                {trip.hotel_name && (
                    <View style={S.hotelBox}>
                        <Text style={S.hotelLabel}>Hotel:</Text>
                        {trip.hotel_lat && trip.hotel_lng ? (
                            <Link
                                src={mapsUrl(trip.hotel_lat, trip.hotel_lng)}
                                style={[S.hotelName, { color: "#2a7c6f", textDecoration: "underline" }]}
                            >
                                {trip.hotel_name}
                            </Link>
                        ) : (
                            <Text style={S.hotelName}>{trip.hotel_name}</Text>
                        )}
                    </View>
                )}

                {/* ── Zile cu obiective ── */}
                {days.map((day) => (
                    <View key={day.id_day} style={S.daySection} wrap={false}>
                        <Text style={S.dayTitle}>
                            {"Ziua " + day.day_index +
                                (day.calendar_date ? "  ·  " + fmt(day.calendar_date) : "")}
                        </Text>
                        <ObjectivesTable objectives={day.objectives} />
                    </View>
                ))}

                {/* ── Neatribuite ── */}
                {unassigned && unassigned.length > 0 && (
                    <View style={S.unassignedSection} wrap={false}>
                        <Text style={S.dayTitle}>Neatribuite</Text>
                        <ObjectivesTable objectives={unassigned} />
                    </View>
                )}

                {/* ── Footer ── */}
                <View style={S.footer} fixed>
                    <Text style={S.footerText}>
                        {"Itinerar " + trip.destination_name + ", generat pe " + today}
                    </Text>
                    <Text
                        style={S.footerText}
                        render={({ pageNumber, totalPages }) =>
                            `${pageNumber} / ${totalPages}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
}
