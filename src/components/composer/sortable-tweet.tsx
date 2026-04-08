
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { TweetCard } from "./tweet-card";

interface SortableTweetProps {
  id: string;
  tweet: any;
  index: number;
  totalTweets: number;
  updateTweet: (id: string, content: string) => void;
  updateTweetPreview?: ((id: string, preview: any) => void) | undefined;
  removeTweet: (id: string) => void;
  removeTweetMedia: (id: string, url: string) => void;
  triggerFileUpload: (id: string) => void;
  openAiImage?: (tweetId: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onClearTweet?: () => void;
  suggestedHashtags?: string[];
  onHashtagClick?: (tag: string) => void;
  tier?: XSubscriptionTier | undefined;
  // Phase 3: Highlight target tweets when AI panel is open
  isAiTarget?: boolean;
  onConvertToThread?: () => void;
  selectedTier?: XSubscriptionTier | undefined;
}

export function SortableTweet({ id, tweet, index, totalTweets, updateTweet, updateTweetPreview, removeTweet, removeTweetMedia, triggerFileUpload, openAiImage, onMove, onClearTweet, suggestedHashtags, onHashtagClick, tier, isAiTarget = false, onConvertToThread, selectedTier }: SortableTweetProps) {
  const isFirst = index === 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    // P4-F: role="group" + aria-label so screen readers announce "Tweet 2 of 5" etc.
    <div
      ref={setNodeRef}
      style={style}
      {...(totalTweets > 1 && {
        role: "group",
        "aria-label": `Tweet ${index + 1} of ${totalTweets}`,
      })}
    >
        <TweetCard
            tweet={tweet}
            index={index}
            totalTweets={totalTweets}
            updateTweet={updateTweet}
            updateTweetPreview={updateTweetPreview}
            removeTweet={removeTweet}
            removeTweetMedia={removeTweetMedia}
            triggerFileUpload={triggerFileUpload}
            {...(openAiImage !== undefined && { openAiImage })}
            dragHandleProps={{...attributes, ...listeners}}
            isFirst={isFirst}
            {...(index > 0 && { onMoveUp: () => onMove(index, index - 1) })}
            {...(index < totalTweets - 1 && { onMoveDown: () => onMove(index, index + 1) })}
            {...(onClearTweet !== undefined && { onClearTweet })}
            {...(suggestedHashtags !== undefined && { suggestedHashtags })}
            {...(onHashtagClick !== undefined && { onHashtagClick })}
            {...(tier !== undefined && { tier })}
            isAiTarget={isAiTarget}
            {...(onConvertToThread !== undefined && { onConvertToThread })}
            {...(selectedTier !== undefined && { selectedTier })}
        />
    </div>
  );
}
