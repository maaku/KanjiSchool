// Copyright (c) 2021-2022 Drew Edwards
// This file is part of KanjiSchool under AGPL-3.0.
// Full details: https://github.com/Lemmmy/KanjiSchool/blob/master/LICENSE

import { reverse } from "../mutations";
import { asc } from "./asc.comparator";

export const desc = reverse(asc);
