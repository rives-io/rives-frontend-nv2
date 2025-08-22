import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import Footer from "./components/Footer";
import PrivyProviders from "./utils/privyProvider";
import { envClient } from "./utils/clientEnv";

export const metadata: Metadata = {
  metadataBase: new URL(envClient.DEPLOYMENT_URL),
  title: {
    template: "%s | RIVES",
    default: "RIVES",
  },
  description: "RISC-V Verifiable Entertainment System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const consent = await cookies().get("ga_consent");

  return (
    <html lang="en-US">
      <body>
        <PrivyProviders>
          <Navbar></Navbar>
          {children}
          <Footer></Footer>
        </PrivyProviders>
      </body>
    </html>
  );
}
