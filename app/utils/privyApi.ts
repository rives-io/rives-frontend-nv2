"use server";
import { envServer } from "@/app/utils/serverEnv";

const privy_url = "https://auth.privy.io/api/v1/users/search";

export interface User {
  username: string;
  name: string;
  picture_url: string;
}

export async function getUsersByAddress(addressList: Array<string>) {
  const res = await fetch(privy_url, {
    method: "POST",
    headers: {
      "privy-app-id": envServer.PRIVY_APP_ID,
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        btoa(`${envServer.PRIVY_APP_ID}:${envServer.PRIVY_APP_SECRET}`),
    },
    body: JSON.stringify({
      walletAddresses: addressList,
    }),
    next: { revalidate: 300 },
  });

  const users = await res.json();

  const userMap = buildUserAddressMap(users.data);
  return JSON.stringify(userMap);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildUserAddressMap(users: Array<any>) {
  let user;
  const userMap: Record<string, User> = {};

  if (!users) return userMap;

  for (let i = 0; i < users.length; i++) {
    user = users[i];

    if (user["linked_accounts"].length != 2) continue;

    let wallet_account;
    let twitter_account;

    if (user["linked_accounts"][0].type == "wallet") {
      wallet_account = user["linked_accounts"][0];
      twitter_account = user["linked_accounts"][1];
    } else if (user["linked_accounts"][0].type == "twitter_oauth") {
      twitter_account = user["linked_accounts"][0];
      wallet_account = user["linked_accounts"][1];
    }

    if (!(wallet_account && twitter_account)) continue;

    userMap[wallet_account.address.toLowerCase()] = {
      username: twitter_account.username,
      name: twitter_account.name,
      picture_url: twitter_account.profile_picture_url,
    };
  }

  return userMap;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
