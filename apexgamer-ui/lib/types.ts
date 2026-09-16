export type Tag = {
  id: number;
  name: string | null;
  slug: string | null;
  language: string | null;
  gamesCount: number | null;
  imageBackground: string | null;
};

export type Screenshot = {
  id: number;
  gameId: number;
  remoteId: number | null;
  image: string | null;
};

export type Review = {
  id: number;
  gameId: number;
  reviewText: string | null;
  votesUp: number | null;
  recommendationId: string | null;
};

export type GameCategory = "AAA" | "INDIE" | "UNCLASSIFIED";
export type GameSort = "trending" | "popular" | "newest";

export type VideoGuideCategory = "REVIEW" | "BEFORE_YOU_BUY" | "GAMEPLAY" | "NEW_PLAYER_GUIDE";

export type CommentStance = "POSITIVE" | "NEGATIVE" | "MIXED";

// A YouTube comment the backend judged to be a genuine opinion of the game.
// Only review videos carry these; everything else has an empty array.
export type VideoComment = {
  id: number;
  youtubeCommentId: string;
  authorName: string | null;
  authorChannelUrl: string | null;
  text: string;
  likeCount: number;
  replyCount: number;
  stance: CommentStance;
  specificity: number;
  publishedAt: string | null;
};

export type VideoGuide = {
  id: number;
  gameId: number;
  youtubeId: string;
  title: string;
  channelName: string | null;
  thumbnail: string | null;
  category: VideoGuideCategory;
  aiSummary: string | null;
  publishedAt: string | null;
  createdAt: string;
  comments: VideoComment[];
};

// Present only when enough genuine viewer opinions existed to summarize and
// the game is released; null otherwise.
export type ReviewCommentSummary = {
  sentiment: "positive" | "negative" | "mixed";
  verdict: string;
  praised: string[];
  criticized: string[];
  opinionCount: number;
  videoCount: number;
  stanceCounts: { positive: number; negative: number; mixed: number };
};

export type VideoGuidesResponse = {
  videos: VideoGuide[];
  reviewSummary: ReviewCommentSummary | null;
};

// One "Memory: 8 GB RAM" line from a Steam requirements list. `label` is null
// for unlabelled notes such as "Requires a 64-bit processor and operating system".
export type RequirementRow = {
  label: string | null;
  value: string;
};

export type RequirementTier = {
  minimum?: RequirementRow[];
  recommended?: RequirementRow[];
};

// Only the OSes a game actually ships on are present.
export type SystemRequirements = Partial<Record<"windows" | "mac" | "linux", RequirementTier>>;

export type Game = {
  id: number;
  rId: number;
  steamId: number | null;
  name: string | null;
  backgroundImage: string | null;
  dominantColor: string | null;
  releaseDate: string | null;
  ratingMetacritic: number | null;
  ratingRawg: number | null;
  pros: string[];
  cons: string[];
  addedCount: number | null;
  steamCcu: number | null;
  steamOwnersLabel: string | null;
  igdbPopularity: number | null;
  trendingScore: number | null;
  category: GameCategory;
  platforms: string[];
  systemRequirements: SystemRequirements | null;
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
  screenshots: Screenshot[];
  tags: Tag[];
};

export type GamesPage = {
  data: Game[];
  paging: {
    // Value of the field the current sort orders by, for the last row on this page.
    after?: string | number | null;
    afterId?: number;
  };
};
