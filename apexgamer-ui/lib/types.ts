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
};

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
