// Copyright (c) 2021-2022 Drew Edwards
// This file is part of KanjiSchool under AGPL-3.0.
// Full details: https://github.com/Lemmmy/KanjiSchool/blob/master/LICENSE

import { Alert } from "antd";

import { useUser } from "@api";

export function SubscriptionStatus(): JSX.Element | null {
  const user = useUser();
  if (!user
    || (user.data.subscription.type !== "free" &&
      user.data.subscription.type !== "unknown")
    || user.data.level < user.data.subscription.max_level_granted
  ) return null;

  return <Alert
    type="warning"
    message={<>
      You have reached the last free level! Please visit <a href="https://www.wanikani.com" target="_blank" rel="noopener noreferrer">wanikani.com</a> for more information.
    </>}
    style={{ marginBottom: 24 }}
  />;
}
