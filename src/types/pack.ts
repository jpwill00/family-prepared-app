import { z } from "zod";
import {
  PackManifestSchema,
  PackAuthorSchema,
  ContentAreaRefSchema,
  InstalledPackEntrySchema,
  InstalledPacksSchema,
} from "@/lib/schemas/pack";

export type ContentAreaRef = z.infer<typeof ContentAreaRefSchema>;
export type PackAuthor = z.infer<typeof PackAuthorSchema>;
export type PackManifest = z.infer<typeof PackManifestSchema>;
export type InstalledPackEntry = z.infer<typeof InstalledPackEntrySchema>;
export type InstalledPacks = z.infer<typeof InstalledPacksSchema>;
