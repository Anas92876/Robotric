import { useState, useCallback } from "react";
import { api } from "../../lib/api";

export interface ProgramImage {
  url: string;
  publicId: string;
}

export interface TrainingProgram {
  title: string;
  age: string;
  description: string;
  hours?: string;
  hoursPerLevel?: string;
  levels?: string;
  available: boolean;
  prerequisite?: string;
  certificate?: boolean;
  whatYouLearn?: string[];
  images?: ProgramImage[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TrainingDepartment {
  name: string;
  tagline: string;
  description: string;
  coverImage: { url: string; publicId: string };
  programs: TrainingProgram[];
}

export interface TrackBase {
  title: string;
  subtitle: string;
  description: string;
}

export interface TrainingTracks {
  summer:       TrackBase & { programs: TrainingProgram[] };
  winter:       TrackBase & { programs: TrainingProgram[] };
  yearRound:    TrackBase & { faq: FaqItem[]; departments: TrainingDepartment[] };
  competitions: TrackBase & { programs: TrainingProgram[] };
}

export interface TrainingStatsValues {
  studentsTrained: string;
  programTracks:   string;
  yearsExperience: string;
  handsOnLearning: string;
}

export interface TrainingPageContentData {
  _id?: string;
  lang: "ar" | "en";
  statsValues: TrainingStatsValues;
  tracks: TrainingTracks;
}

const STATS_DEFAULTS: TrainingStatsValues = {
  studentsTrained: "2200+",
  programTracks:   "25+",
  yearsExperience: "6",
  handsOnLearning: "100%",
};

function mapProgram(p: any): TrainingProgram {
  return {
    title:         p.title         ?? "",
    age:           p.age           ?? "",
    description:   p.description   ?? "",
    hours:         p.hours         ?? "",
    hoursPerLevel: p.hoursPerLevel ?? "",
    levels:        p.levels        ?? "",
    available:     p.available !== false,
    prerequisite:  p.prerequisite  ?? "",
    certificate:   p.certificate   ?? false,
    whatYouLearn:  p.whatYouLearn  ?? [],
    images:        p.images        ?? [],
  };
}

function mapDepartment(d: any): TrainingDepartment {
  return {
    name:        d.name        ?? "",
    tagline:     d.tagline     ?? "",
    description: d.description ?? "",
    coverImage:  { url: d.coverImage?.url ?? "", publicId: d.coverImage?.publicId ?? "" },
    programs:    (d.programs ?? []).map(mapProgram),
  };
}

export function buildContentFromI18n(lang: "ar" | "en", t: (key: string, opts?: any) => any): TrainingPageContentData {
  const tracks = (t("map.tracks", { returnObjects: true }) as any) ?? {};
  return {
    lang,
    statsValues: STATS_DEFAULTS,
    tracks: {
      summer: {
        title:       tracks.summer?.title       ?? "",
        subtitle:    tracks.summer?.subtitle    ?? "",
        description: tracks.summer?.description ?? "",
        programs:    (tracks.summer?.programs   ?? []).map(mapProgram),
      },
      winter: {
        title:       tracks.winter?.title       ?? "",
        subtitle:    tracks.winter?.subtitle    ?? "",
        description: tracks.winter?.description ?? "",
        programs:    (tracks.winter?.programs   ?? []).map(mapProgram),
      },
      yearRound: {
        title:       tracks.yearRound?.title       ?? "",
        subtitle:    tracks.yearRound?.subtitle    ?? "",
        description: tracks.yearRound?.description ?? "",
        faq:         (tracks.yearRound?.faq        ?? []).map((f: any) => ({ question: f.question ?? "", answer: f.answer ?? "" })),
        departments: (tracks.yearRound?.departments ?? []).map(mapDepartment),
      },
      competitions: {
        title:       tracks.competitions?.title       ?? "",
        subtitle:    tracks.competitions?.subtitle    ?? "",
        description: tracks.competitions?.description ?? "",
        programs:    (tracks.competitions?.programs   ?? []).map(mapProgram),
      },
    },
  };
}

export function useCLOTrainingContent() {
  const [content, setContent]   = useState<TrainingPageContentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchContent = useCallback(async (lang: "ar" | "en", i18nFallback: TrainingPageContentData) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/clo/training-content/${lang}`);
      setContent(res.data.data ?? i18nFallback);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load content");
      setContent(i18nFallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveContent = useCallback(async (lang: "ar" | "en", data: TrainingPageContentData) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.put(`/clo/training-content/${lang}`, data);
      setContent(res.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save content";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { content, setContent, isLoading, isSaving, error, fetchContent, saveContent };
}
