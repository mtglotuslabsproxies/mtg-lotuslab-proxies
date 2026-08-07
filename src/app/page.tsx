import ProxyBuilder from "@/components/proxy-builder";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <ProxyBuilder />
    </main>
  );
}
