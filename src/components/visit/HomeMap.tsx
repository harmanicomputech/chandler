'use client';
import { MapView } from '@/components/shared/MapView';
import { VISIT_MAP_CATEGORIES } from './mapCategories';
export function HomeMap() { return <MapView source="/api/map/points/" categories={VISIT_MAP_CATEGORIES} height="560px" compact />; }
