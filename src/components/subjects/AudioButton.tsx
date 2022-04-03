// Copyright (c) 2021-2022 Drew Edwards
// This file is part of KanjiSchool under AGPL-3.0.
// Full details: https://github.com/Lemmmy/KanjiSchool/blob/master/LICENSE

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { Button, notification, Tooltip } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import classNames from "classnames";

import { RootState } from "@store";
import { useSelector } from "react-redux";

import { ApiSubjectVocabulary, getStoredAudio, useUserLevel } from "@api";

import { sample } from "lodash-es";
import { GlobalHotKeys } from "react-hotkeys";

import { criticalError } from "@utils";

import Debug from "debug";
const debug = Debug("kanjischool:audio-button");

let audioContext: AudioContext;

type VocabAudioHookRes = [
  (pronunciation: string) => void, // play(pronunciation)
  boolean, // loading
  boolean, // disabled
  boolean, // playing
];

function playSound(
  buffer: AudioBuffer | undefined,
  setPlaying: Dispatch<SetStateAction<boolean>>
) {
  try {
    if (!buffer) {
      debug("playSound: not playing sound, buffer was undefined");
      return;
    }

    if (audioContext.state === "suspended") {
      debug("playSound: audioContext was suspended! attempting to resume");
      audioContext.resume();
    }

    debug("playSound: audioContext state: %s; playing sound (length: %o, duration: %o)", audioContext.state, buffer.length, buffer.duration);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.onended = () => {
      source.disconnect();
      debug("playSound: buffer source disconnected");
      setPlaying(false);
    };

    source.connect(audioContext.destination);
    source.start();
    setPlaying(true);
  } catch (e) {
    debug("error while playing audio", e);
    criticalError(e);
    setPlaying(false);
  }
}

export function useVocabAudio(
  subject?: ApiSubjectVocabulary
): VocabAudioHookRes {
  const userLevel = useUserLevel();
  const levelLocked = userLevel + 1 < (subject?.data.level || 1);
  const stillSyncing = useSelector((s: RootState) => s.sync.syncingAudio);

  const [savedPronunciation, setSavedPronunciation] = useState<string>();
  const [buffers, setBuffers] = useState<AudioBuffer[]>();
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  const finalLoading = !subject || (!disabled && (loading || stillSyncing));
  const finalDisabled = !subject || disabled || levelLocked;

  const play = useCallback(async (pronunciation: string) => {
    if (!audioContext) {
      debug("useVocabAudio.play: no audio context yet, creating now");
      audioContext = new AudioContext();
    }

    debug("useVocabAudio.play called %o %s %o %o", subject, pronunciation, finalLoading, finalDisabled);
    if (!subject || finalLoading || finalDisabled) return;

    // If we've already loaded the sounds, play a random one
    if (buffers && savedPronunciation === pronunciation) {
      debug("useVocabAudio.play: playing saved pronunciation %s: %o", pronunciation, buffers);
      playSound(sample(buffers), setPlaying);
      return;
    }

    debug("useVocabAudio.play: fetching audio");
    setLoading(true);

    // Find all the voice actors for this subject + pronunciation
    const subjectId = subject.id;
    const pronunciations = subject.data.pronunciation_audios
      .filter(a => a.metadata.pronunciation === pronunciation);
    const actors = [...new Set(pronunciations.map(p => p.metadata.voice_actor_id))];
    const newBuffers: AudioBuffer[] = [];

    // Decode the audio for each voice actor
    for (const actor of actors) {
      const storedAudio = await getStoredAudio(subjectId, actor, pronunciation);
      if (!storedAudio) {
        debug("useVocabAudio.play: missing audio for subject id %o, actor %o, pronunciation %s",
          subjectId, actor, pronunciation);
        notification.error({ message: "Missing audio, see console for details." });
        setDisabled(true);
        return;
      }

      const [blob, contentType] = storedAudio;
      const audioData = await blob.arrayBuffer();

      debug("useVocabAudio.play: new sound: subject id %o, actor %o, pronunciation %s, contentType %s",
        subjectId, actor, pronunciation, contentType);
      try {
        const buffer = await audioContext.decodeAudioData(audioData);
        newBuffers.push(buffer);
      } catch (e) {
        debug("error while decoding audio", e);

        const audioEl = document.createElement("audio");
        const canPlay = audioEl.canPlayType(contentType) || "NO";
        audioEl.remove();
        debug("canPlayType %s? %s", contentType, canPlay);

        criticalError(e, { contexts: { audio: {
          "subject_id": subjectId,
          "actor_id": actor,
          "content_type": contentType,
          "can_play": canPlay
        }}});

        notification.error({ message: "Failed to decode audio, see console for details." });
        setDisabled(true);
        return;
      }
    }

    debug("useVocabAudio.play: now playing fresh sound");
    playSound(sample(newBuffers), setPlaying);
    setBuffers(newBuffers);
    setSavedPronunciation(pronunciation);
    setLoading(false);
  }, [subject, savedPronunciation, buffers, finalLoading, finalDisabled]);

  return [play, finalLoading, finalDisabled, playing];
}

const KEY_MAP = {
  PLAY_AUDIO: ["p", "j", "shift+j"]
};

interface Props {
  subject: ApiSubjectVocabulary;
  pronunciation: string;
  autoPlay?: boolean;
  hasShortcut?: boolean;
}

export function AudioButton({
  subject,
  pronunciation,
  autoPlay, hasShortcut
}: Props): JSX.Element {
  const [play, loading, disabled, playing] = useVocabAudio(subject);
  const triggerPlay = useCallback(() => play(pronunciation), [play, pronunciation]);

  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  useEffect(() => {
    if (!autoPlay || hasAutoPlayed) return;
    debug("auto-playing audio");
    triggerPlay();
    setHasAutoPlayed(true);
  }, [triggerPlay, autoPlay, hasAutoPlayed]);

  const classes = classNames("subject-audio-button", { playing });

  return <>
    {/* Wrap the button in a tooltip to help with keyboard shortcut
      * discoverability. */}
    <Tooltip title={hasShortcut ? <>Play audio <b>(P)</b></> : undefined}>
      <Button
        loading={loading}
        disabled={disabled}
        onClick={triggerPlay}
        className={classes}
      >
        <SoundOutlined />
        {pronunciation}
      </Button>
    </Tooltip>

    {/* Keyboard shortcuts to play this audio, if allowed */}
    {hasShortcut && <GlobalHotKeys
      keyMap={KEY_MAP}
      handlers={{ PLAY_AUDIO: triggerPlay }}
      allowChanges
    />}
  </>;
}
