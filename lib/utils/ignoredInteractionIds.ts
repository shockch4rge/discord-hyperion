import { HelpPaginatedEmbedComponentIds, SharedPaginatedEmbedComponentIds } from "../builtins/PaginatedEmbed";

export const ignoredInteractionIds = [
    ...Object.values(SharedPaginatedEmbedComponentIds),
    ...Object.values(HelpPaginatedEmbedComponentIds),
]