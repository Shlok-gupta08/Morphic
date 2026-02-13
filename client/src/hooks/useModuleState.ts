import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { db } from '../services/db';

const MAX_HISTORY = 20;

interface State<T> {
    current: T;
    history: T[];
    index: number;
}

type Action<T> =
    | { type: 'LOAD'; payload: T }
    | { type: 'SET'; payload: T | ((prev: T) => T) }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'REDO' };

function createReducer<T>() {
    return (state: State<T>, action: Action<T>): State<T> => {
        switch (action.type) {
            case 'LOAD':
                return {
                    current: action.payload,
                    history: [action.payload],
                    index: 0
                };
            case 'SET': {
                const newState = typeof action.payload === 'function'
                    ? (action.payload as (prev: T) => T)(state.current)
                    : action.payload;

                if (newState === state.current) return state;

                const newHistory = state.history.slice(0, state.index + 1);
                newHistory.push(newState);

                if (newHistory.length > MAX_HISTORY) {
                    newHistory.shift();
                }

                return {
                    current: newState,
                    history: newHistory,
                    index: newHistory.length - 1
                };
            }
            case 'UNDO': {
                if (state.index <= 0) return state;
                const newIndex = state.index - 1;
                return {
                    ...state,
                    current: state.history[newIndex],
                    index: newIndex
                };
            }
            case 'REDO': {
                if (state.index >= state.history.length - 1) return state;
                const newIndex = state.index + 1;
                return {
                    ...state,
                    current: state.history[newIndex],
                    index: newIndex
                };
            }

            default:
                return state;
        }
    };
}

export interface ModuleState<T> {
    state: T;
    setState: (newState: T | ((prev: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isLoading: boolean;
}

export function useModuleState<T>(key: string, initialState: T): ModuleState<T> {
    const [reducerState, dispatch] = useReducer(createReducer<T>(), {
        current: initialState,
        history: [initialState],
        index: 0
    });

    const [isLoading, setIsLoading] = useState(true);
    const isLoadedRef = useRef(false);

    // Load from DB
    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const stored = await db.get<T>(key);
                if (mounted && stored) {
                    dispatch({ type: 'LOAD', payload: stored });
                }
            } catch (err) {
                console.error('Failed to load module state:', err);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    isLoadedRef.current = true;
                }
            }
        }
        load();
        return () => { mounted = false; };
    }, [key]);

    // Persist to DB on change
    useEffect(() => {
        if (isLoadedRef.current) {
            db.set(key, reducerState.current).catch(console.error);
        }
    }, [reducerState.current, key]);

    const setState = useCallback((payload: T | ((prev: T) => T)) => {
        dispatch({ type: 'SET', payload });
    }, []);

    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const clear = useCallback(() => {
        // Instead of resetting history, we push a new state that is "empty"
        // This allows the user to Undo the "Clear" action.
        dispatch({ type: 'SET', payload: initialState });
        // We still might want to clear the DB, but "SET" handles persistence via effect.
        // However, if we want to ensure it's "gone" until next write?
        // Actually, the effect:
        // useEffect(() => { if (isLoadedRef) db.set(...) }, [reducerState.current])
        // will automatically save this empty state to DB.
    }, [initialState]);

    return {
        state: reducerState.current,
        setState,
        undo,
        redo,
        clear,
        canUndo: reducerState.index > 0,
        canRedo: reducerState.index < reducerState.history.length - 1,
        isLoading
    };
}
