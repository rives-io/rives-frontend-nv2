import React from "react";
import DiscordLogo from "./svg/DiscordLogo";
import XIcon from "@mui/icons-material/X";
import GitHubIcon from "@mui/icons-material/GitHub";
import Link from "next/link";
import CartesiLogo from "@/public/cartesi_icon.png";
import Image from "next/image";

function Footer() {
  return (
    <footer className="footer">
      <div className="flex flex-wrap justify-evenly items-center">
        <div className="flex flex-col">
          <Link
            className="pixelated-font hover:text-rives-purple"
            href={"https://rives.io/blog/"}
          >
            Blog
          </Link>
          <Link
            className="pixelated-font hover:text-rives-purple"
            href={"https://rives.io/docs/category/riv/"}
          >
            Documentation
          </Link>
          <Link
            className="pixelated-font hover:text-rives-purple"
            href={"/upload-cartridge"}
          >
            Upload Cartridge
          </Link>
          <Link
            className="pixelated-font hover:text-rives-purple"
            href={"https://rives.io/"}
          >
            rives.io
          </Link>
          <Link
            className="pixelated-font hover:text-rives-purple"
            href={"https://rives.io/terms_of_service"}
          >
            Terms of Service
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1 items-center">
            <Link
              href={"https://discord.gg/FQnQqKWVn8"}
              className="hover:text-rives-purple"
            >
              <DiscordLogo />
            </Link>
            <Link
              href={"https://twitter.com/rives_io"}
              className="h-6 hover:text-rives-purple"
            >
              <XIcon />
            </Link>
            <Link
              href={"https://github.com/rives-io"}
              className="h-6 hover:text-rives-purple"
            >
              <GitHubIcon />
            </Link>
          </div>

          <Link
            href="https://cartesi.io/"
            className="flex gap-2 items-center py-1 px-2 rounded-full bg-[#00F7FF]"
          >
            <Image
              width={24}
              height={24}
              quality={100}
              src={CartesiLogo}
              alt="Not found"
            ></Image>
            <span className="pixelated-font text-black text-sm">
              Powered by Cartesi
            </span>
          </Link>
        </div>
      </div>
      {/* <Link href="https://twitter.com/rives_io" rel="noopener noreferrer" target="_blank" className='flex items-center space-x-2'>
                <XIcon/> <span className='hover:underline'>rives_io</span>
            </Link>
            <Link href="https://discord.gg/FQnQqKWVn8" rel="noopener noreferrer" target="_blank" className='flex items-center space-x-2'>
                <DiscordLogo/> <span className='hover:underline'>RiVES</span>
            </Link> */}
      <div className="flex justify-center pixelated-font">
        &copy; Rives 2026
      </div>
    </footer>
  );
}

export default Footer;
