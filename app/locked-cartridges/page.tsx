import { envClient } from "@/app/utils/clientEnv";
import { CartridgeInfo, CartridgesPayload } from "../backend-libs/core/ifaces";
import { cartridges } from "../backend-libs/core/lib";
import { Metadata } from "next";
import Link from "next/link";
import { timeToDateUTCString } from "../utils/util";

export const revalidate = 0; // revalidate always

export const metadata: Metadata = {
  title: "Locked Cartridges",
  description: "Locked Cartridges",
};

const getLockedCartridges = async () => {
  const inputPayload: CartridgesPayload = {
    locked: true,
    enable_non_primary: true,
    order_by: "created_at",
    order_dir: "desc",
  };

  return (
    await cartridges(inputPayload, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
    })
  ).data;
};

export default async function LockedCartridges() {
  const lockedCartridges = await getLockedCartridges();

  return (
    <main>
      <section className="flex justify-center">
        <table className="w-full max-w-5xl">
          <thead className="text-left">
            <tr>
              <th scope="col" className="">
                #
              </th>
              <th scope="col" className="">
                Id
              </th>
              <th scope="col" className="">
                Name
              </th>
              <th scope="col" className="">
                Created At
              </th>
              <th scope="col" className="">
                User Address
              </th>
            </tr>
          </thead>

          <tbody>
            {lockedCartridges.map((cartridge: CartridgeInfo, index: number) => {
              return (
                <tr key={index} className="hover:bg-rives-purple">
                  <td className="linkTableData">
                    <Link href={`/cartridges/${cartridge.id}`}>
                      <span className="me-6">{index + 1}</span>
                    </Link>
                  </td>
                  <td className="linkTableData">
                    <Link href={`/cartridges/${cartridge.id}`}>
                      {cartridge.id}
                    </Link>
                  </td>
                  <td className="linkTableData">
                    <Link href={`/cartridges/${cartridge.id}`}>
                      {cartridge.name}
                    </Link>
                  </td>
                  <td className="linkTableData">
                    <Link href={`/cartridges/${cartridge.id}`}>
                      {timeToDateUTCString(cartridge.created_at)}
                    </Link>
                  </td>
                  <td className="linkTableData">
                    <Link href={`/cartridges/${cartridge.id}`}>
                      {cartridge.user_address}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
