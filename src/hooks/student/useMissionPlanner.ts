import { useCallback, useEffect, useState } from 'react';
import type { Point, Pose } from '../../utils/missionPlanner';

const STORAGE_KEY = 'robotrick_mission_planner_missions';

export interface SavedMission {
  name: string;
  fieldWidth: number;
  fieldHeight: number;
  start: Pose;
  waypoints: Point[];
  backgroundImage?: string | null;
  updatedAt: string;
}

export const FIELD_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'WRO Standard (2362 x 1143 mm)', width: 2362, height: 1143 },
  { label: 'Half Field (1181 x 1143 mm)', width: 1181, height: 1143 },
  { label: 'Custom', width: 0, height: 0 },
];

function loadSavedMissions(): SavedMission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useMissionPlanner() {
  const [fieldWidth, setFieldWidth] = useState<number>(FIELD_PRESETS[0].width);
  const [fieldHeight, setFieldHeight] = useState<number>(FIELD_PRESETS[0].height);
  const [start, setStart] = useState<Pose>({ x: 0, y: 0, theta: 0 });
  const [waypoints, setWaypoints] = useState<Point[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [savedMissions, setSavedMissions] = useState<SavedMission[]>([]);
  const [currentMissionName, setCurrentMissionName] = useState<string>('');

  useEffect(() => {
    setSavedMissions(loadSavedMissions());
  }, []);

  const addWaypoint = useCallback((p: Point) => {
    setWaypoints((prev) => [...prev, p]);
  }, []);

  const updateWaypoint = useCallback((index: number, p: Point) => {
    setWaypoints((prev) => prev.map((w, i) => (i === index ? p : w)));
  }, []);

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderWaypoint = useCallback((index: number, direction: -1 | 1) => {
    setWaypoints((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }, []);

  const updateStart = useCallback((pose: Partial<Pose>) => {
    setStart((prev) => ({ ...prev, ...pose }));
  }, []);

  const newMission = useCallback(() => {
    setWaypoints([]);
    setStart({ x: 0, y: 0, theta: 0 });
    setBackgroundImage(null);
    setCurrentMissionName('');
  }, []);

  const saveMission = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const mission: SavedMission = {
      name: trimmed,
      fieldWidth,
      fieldHeight,
      start,
      waypoints,
      backgroundImage,
      updatedAt: new Date().toISOString(),
    };
    setSavedMissions((prev) => {
      const others = prev.filter((m) => m.name !== trimmed);
      const next = [...others, mission];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setCurrentMissionName(trimmed);
  }, [fieldWidth, fieldHeight, start, waypoints, backgroundImage]);

  const loadMission = useCallback((name: string) => {
    const mission = savedMissions.find((m) => m.name === name);
    if (!mission) return;
    setFieldWidth(mission.fieldWidth);
    setFieldHeight(mission.fieldHeight);
    setStart(mission.start);
    setWaypoints(mission.waypoints);
    setBackgroundImage(mission.backgroundImage ?? null);
    setCurrentMissionName(mission.name);
  }, [savedMissions]);

  const deleteMission = useCallback((name: string) => {
    setSavedMissions((prev) => {
      const next = prev.filter((m) => m.name !== name);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setCurrentMissionName((prev) => (prev === name ? '' : prev));
  }, []);

  return {
    fieldWidth,
    fieldHeight,
    setFieldWidth,
    setFieldHeight,
    start,
    setStart,
    updateStart,
    waypoints,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    reorderWaypoint,
    backgroundImage,
    setBackgroundImage,
    savedMissions,
    currentMissionName,
    newMission,
    saveMission,
    loadMission,
    deleteMission,
  };
}
