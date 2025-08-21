import { createContext, useContext } from "react";
import { IEngineAPI } from "./IEngineAPI";

export const EngineAPIContext = createContext<IEngineAPI | null>(null);

export function useEngineAPI(): IEngineAPI {
    const ctx = useContext(EngineAPIContext);
    if (!ctx) throw new Error("EngineAPIContext not found");
    return ctx;
}