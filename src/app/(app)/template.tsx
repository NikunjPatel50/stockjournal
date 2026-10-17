export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full animate-in fade-in-0 duration-200 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
