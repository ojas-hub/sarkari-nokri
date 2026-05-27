import { useMemo } from 'react';
import { readStoredNotes } from '../services/notesService.js';
export function useNotes() { return useMemo(() => readStoredNotes(), []); }

