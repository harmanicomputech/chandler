'use client';
import { useEffect } from 'react';
import { track } from '@/components/shared/track';
export function WeatherBeacon() { useEffect(() => { track('visit', 'weather_view'); }, []); return null; }
