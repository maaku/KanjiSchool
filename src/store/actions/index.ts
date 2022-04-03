// Copyright (c) 2021-2022 Drew Edwards
// This file is part of KanjiSchool under AGPL-3.0.
// Full details: https://github.com/Lemmmy/KanjiSchool/blob/master/LICENSE

import * as authActions from "./AuthActions";
import * as syncActions from "./SyncActions";
import * as sessionActions from "./SessionActions";
import * as settingsActions from "./SettingsActions";

const RootAction = {
  auth: authActions,
  sync: syncActions,
  session: sessionActions,
  settings: settingsActions,
};
export default RootAction;
