import { appName } from "@casita/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#f7f5ef",
        color: "#1f2933"
      }}
    >
      <section style={{ width: "min(720px, 100%)" }}>
        <p style={{ margin: 0, color: "#52796f", fontWeight: 700 }}>{appName}</p>
        <h1 style={{ margin: "12px 0", fontSize: 44, lineHeight: 1.05 }}>
          Gestion domestica clara, compartida y preparada para offline.
        </h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>
          La interfaz web esta lista como punto de entrada inicial. API configurada en <code>{apiUrl}</code>.
        </p>
      </section>
    </main>
  );
}
