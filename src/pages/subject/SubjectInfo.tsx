// Copyright (c) 2021-2022 Drew Edwards
// This file is part of KanjiSchool under AGPL-3.0.
// Full details: https://github.com/Lemmmy/KanjiSchool/blob/master/LICENSE

import { useState, useCallback } from "react";
import { Divider } from "antd";
import classNames from "classnames";

import {
  StoredSubject, ApiSubjectKanjiInner, ApiSubjectRadicalInner,
  ApiSubjectVocabularyInner, useAssignmentBySubjectId,
  useStudyMaterialBySubjectId
} from "@api";
import { SubjectHintStage, shouldShowObject } from "./hintStages";

import { AnchorList } from "./AnchorList";

import { SubjectInfoLessonRow } from "./SubjectInfoLessonRow";
import { SubjectInfoTopRow } from "./SubjectInfoTopRow";
import { StudyMaterialNote } from "./StudyMaterialNote";
import { StudyMaterialSynonyms } from "./StudyMaterialSynonyms";
import { PartsOfSpeech } from "./PartsOfSpeech";
import { ContextSentences } from "./ContextSentences";
import { Jisho } from "./Jisho";
import { YourProgression } from "./progression/YourProgression";
import { SubjectInfoDebug } from "./debug/SubjectInfoDebug";

import { SubjectMarkup } from "@comp/subjects/SubjectMarkup";
import { SubjectGrid } from "@comp/subjects/lists/grid";
import { VocabList } from "@comp/subjects/lists/vocab";

import { useBooleanSetting } from "@utils";
import { clamp } from "lodash-es";

export interface SubjectInfoProps {
  subject: StoredSubject;
  useHintStage?: boolean;
  questionType?: "meaning" | "reading";
  charactersMax?: number;

  lessonCounter?: number;
  lessonsTotal?: number;
  onPrevLesson?: () => void;
  onNextLesson?: () => void;

  autoPlayAudio?: boolean;

  showToc?: boolean;
}

export function SubjectInfo(props: SubjectInfoProps): JSX.Element {
  const {
    subject, charactersMax,
    lessonCounter, lessonsTotal, onPrevLesson, onNextLesson,
    autoPlayAudio, showToc
  } = props;

  // Overrides for the debug row
  const [useHintStageOverride, setUseHintStageOverride] = useState<boolean>();
  const useHintStage = useHintStageOverride ?? props.useHintStage;
  const [questionTypeOverride, setQuestionTypeOverride] = useState<"meaning" | "reading">();
  const questionType = questionTypeOverride ?? props.questionType;

  const defaultHintStage = useBooleanSetting("hideHintsOnIncorrect") ? -1 : 0;
  const [hintStage, setHintStage] = useState<SubjectHintStage>(defaultHintStage);
  const nextHintStage = useCallback(() =>
    setHintStage(s => clamp(s + 1, -1, 2) as SubjectHintStage), []);

  const objectType = subject.object;
  const { characters, meaning_mnemonic } = subject.data;
  const radicalSubjectData = subject.data as ApiSubjectRadicalInner;
  const kanjiSubjectData = subject.data as ApiSubjectKanjiInner;
  const vocabSubjectData = subject.data as ApiSubjectVocabularyInner;

  const assignment = useAssignmentBySubjectId(subject.id);
  const studyMaterial = useStudyMaterialBySubjectId(subject.id);

  // Whether or not a certain subject info object should be shown, based on the
  // current hint stage and question type.
  const show = shouldShowObject.bind(
    shouldShowObject, useHintStage, objectType, questionType, hintStage
  );

  // Some radicals have images instead of UTF-8 characters. Use the SVGs.
  const hasCharacter = characters !== null;

  const showDebug = useBooleanSetting("subjectInfoDebug");

  // Layout the top row differently if there is more than one character in this
  // vocabulary
  const hasSingleCharacter = !hasCharacter || characters?.length === 1;
  const classes = classNames("subject-info-container", "type-" + objectType, {
    "subject-info-single-character": hasSingleCharacter,
    "subject-info-multiple-characters": !hasSingleCharacter,
  });

  const contents = <div className={classes}>
    {/* Lesson-specific row (lesson count, next button) */}
    {lessonCounter !== undefined
    && lessonsTotal !== undefined
    && onNextLesson !== undefined && (
      <SubjectInfoLessonRow
        lessonCounter={lessonCounter}
        lessonsTotal={lessonsTotal}
        onPrevLesson={onPrevLesson}
        onNextLesson={onNextLesson}
      />
    )}

    {/* Top row (character, level, name, readings) */}
    <a id="subject-info" style={{ position: "absolute", top: -24, height: 1 }} />
    <SubjectInfoTopRow
      subject={subject}
      hasCharacter={hasCharacter}
      hasSingleCharacter={hasSingleCharacter}
      charactersMax={charactersMax}

      hintStage={useHintStage ? hintStage : undefined}
      onNextHintStage={useHintStage ? nextHintStage : undefined}

      hideMeanings={!show("meanings")}
      hideReadings={!show("readings")}
      hideAudio={!show("audio")}

      autoPlayAudio={autoPlayAudio}
    />

    {/* Kanji used radicals */}
    {objectType === "kanji" && show("used_radicals") && <>
      <a id="used-radicals" />
      <Divider orientation="left">Used radicals</Divider>
      <SubjectGrid subjectIds={kanjiSubjectData.component_subject_ids} />
    </>}

    {/* Vocabulary used kanji */}
    {objectType === "vocabulary" && show("used_kanji") && <>
      <a id="used-kanji" />
      <Divider orientation="left">Used kanji</Divider>
      <SubjectGrid
        subjectIds={vocabSubjectData.component_subject_ids}
        hideReading={!show("readings_in_kanji")}
        sortBy={characters ?? undefined}
      />
    </>}

    {/* Meaning mnemonic, always present (except when it's not) */}
    {show("meaning_mnemonic") && <>
      <a id="meaning-mnemonic" />
      <Divider orientation="left">Meaning mnemonic</Divider>
      <SubjectMarkup className="subject-info-meaning-mnemonic">
        {meaning_mnemonic}
      </SubjectMarkup>

      {/* Kanji meaning hint */}
      {objectType === "kanji" && kanjiSubjectData.meaning_hint && (
        <div className="subject-info-hint subject-info-meaning-hint">
          <span className="hint-title meaning-hint-title">Meaning hint</span>
          <SubjectMarkup>
            {kanjiSubjectData.meaning_hint}
          </SubjectMarkup>
        </div>
      )}

      {/* Study material meaning notes */}
      <StudyMaterialNote
        subject={subject} studyMaterial={studyMaterial}
        type="meaning"
      />

      {/* Study material meaning synonyms */}
      <StudyMaterialSynonyms subject={subject} studyMaterial={studyMaterial} />
    </>}

    {/* Reading mnemonic */}
    {objectType !== "radical" && show("reading_mnemonic") && <>
      <a id="reading-mnemonic" />
      <Divider orientation="left">Reading mnemonic</Divider>
      <SubjectMarkup className="subject-info-reading-mnemonic">
        {kanjiSubjectData.reading_mnemonic}
      </SubjectMarkup>

      {/* Kanji reading hint */}
      {objectType === "kanji" && kanjiSubjectData.reading_hint && (
        <div className="subject-info-hint subject-info-reading-hint">
          <span className="hint-title reading-hint-title">Reading hint</span>
          <SubjectMarkup>
            {kanjiSubjectData.reading_hint}
          </SubjectMarkup>
        </div>
      )}

      {/* Study material reading notes */}
      <StudyMaterialNote
        subject={subject} studyMaterial={studyMaterial}
        type="reading"
      />
    </>}

    {/* Kanji jisho data (if available) */}
    {objectType === "kanji" && !!subject.data.jisho &&
      show("kanji_jisho") && <>
      <a id="dictionary-info" />
      <Divider orientation="left">Dictionary info</Divider>
      <Jisho subject={subject} />
    </>}

    {/* Radical used in kanji */}
    {objectType === "radical" && show("used_in_kanji") && <>
      <a id="used-in" />
      <Divider orientation="left">Used in</Divider>
      <SubjectGrid subjectIds={radicalSubjectData.amalgamation_subject_ids} />
    </>}

    {/* Kanji visually similar */}
    {objectType === "kanji" && show("visually_similar_kanji") &&
      kanjiSubjectData.visually_similar_subject_ids.length > 0 && <>
      <a id="visually-similar" />
      <Divider orientation="left">Visually similar</Divider>
      <SubjectGrid
        subjectIds={kanjiSubjectData.visually_similar_subject_ids}
        hideReading={!show("visually_similar_kanji_readings")}
      />
    </>}

    {/* Kanji used in vocabulary */}
    {objectType === "kanji" && show("used_in_vocabulary") && <>
      <a id="used-in" />
      <Divider orientation="left">Used in</Divider>
      <VocabList
        subjectIds={kanjiSubjectData.amalgamation_subject_ids}
        hideReading={!show("readings_in_vocabulary")}
      />
    </>}

    {/* Vocabulary part of speech */}
    {objectType === "vocabulary" && show("part_of_speech") && <>
      <a id="parts-of-speech" />
      <Divider orientation="left">
        {vocabSubjectData.parts_of_speech.length > 1
          ? "Parts of speech"
          : "Part of speech"}
      </Divider>
      <PartsOfSpeech subject={vocabSubjectData} />
    </>}

    {/* Vocabulary context sentences */}
    {objectType === "vocabulary" && show("context_sentences") && <>
      <a id="context-sentences" />
      <Divider orientation="left">Context sentences</Divider>
      <ContextSentences subject={vocabSubjectData} />
    </>}

    {/* Assignment progression */}
    {show("progression") && assignment && <>
      <a id="your-progression" />
      <YourProgression subject={subject} assignment={assignment} />
    </>}

    {/* Debug info */}
    {showDebug && <>
      <a id="debug" />
      <SubjectInfoDebug
        {...props}
        useHintStage={useHintStage} setUseHintStage={setUseHintStageOverride}
        questionType={questionType} setQuestionType={setQuestionTypeOverride}
        hintStage={hintStage} setHintStage={setHintStage}
        show={show}
      />
    </>}
  </div>;

  return <>
    {/* Table of contents */}
    {showToc && <AnchorList subject={subject} assignment={assignment}
      show={show} showDebug={showDebug} />}

    {contents}
  </>;
}
