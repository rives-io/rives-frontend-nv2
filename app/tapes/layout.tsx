import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tapes",
  description: "Tapes",
};

export default async function TapesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
