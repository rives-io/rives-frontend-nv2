import Image from "next/image";
import rivesLogo from "../../public/logo.png";

export default function Loading({ msg }: { msg: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center text-white">
      <Image
        width={384}
        height={216}
        className="animate-bounce"
        src={rivesLogo}
        alt="RiVES logo"
      />
      <span className="-mt-20">{msg}</span>
    </div>
  );
}
