import { Metadata } from "next";
import CartridgesList from "../components/CartridgesList";
//import Link from "next/link";

export const metadata: Metadata = {
  title: "Cartridges",
  description: "Cartridges",
};

export default async function Cartridges() {
  return (
    <main className="gap-4">
      {/* <section className="flex justify-end">
          <Link className='pixelated-font btn mt-2 text-xs shadow' href={"/upload-cartridge"}>Upload Cartridge</Link>
        </section> */}
      <section className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <CartridgesList />
        </div>
      </section>
    </main>
  );
}
